import Redis, { Callback } from 'ioredis';
import { EventEmitter } from 'events';

const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDIS_PUBLIC_URL || process.env.REDISURL;

if (!redisUrl) {
  console.warn('[Redis] No REDIS_URL configured. Operating seamlessly with In-Memory fallback store.');
}

// In-Memory store item with TTL
interface StoreItem {
  value: string;
  expiresAt: number | null; // timestamp in ms, or null if no expiry
}

const memoryEventEmitter = new EventEmitter();
memoryEventEmitter.setMaxListeners(100);
const memoryStore = new Map<string, StoreItem>();

class InMemoryPipeline {
  private queue: Array<() => [Error | null, any]> = [];

  set(key: string, value: string | number, ...args: any[]): this {
    this.queue.push(() => {
      let ttlSeconds: number | null = null;
      if (args.length >= 2 && String(args[0]).toUpperCase() === 'EX') {
        ttlSeconds = Number(args[1]);
      }
      const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
      memoryStore.set(key, { value: String(value), expiresAt });
      return [null, 'OK'];
    });
    return this;
  }

  get(key: string): this {
    this.queue.push(() => {
      const item = memoryStore.get(key);
      if (!item) return [null, null];
      if (item.expiresAt !== null && Date.now() > item.expiresAt) {
        memoryStore.delete(key);
        return [null, null];
      }
      return [null, item.value];
    });
    return this;
  }

  del(...keys: string[]): this {
    this.queue.push(() => {
      let count = 0;
      for (const k of keys) {
        if (memoryStore.delete(k)) count++;
      }
      return [null, count];
    });
    return this;
  }

  incr(key: string): this {
    this.queue.push(() => {
      const item = memoryStore.get(key);
      let nextVal = 1;
      let expiresAt: number | null = null;
      if (item) {
        if (item.expiresAt !== null && Date.now() > item.expiresAt) {
          memoryStore.delete(key);
        } else {
          nextVal = (parseInt(item.value, 10) || 0) + 1;
          expiresAt = item.expiresAt;
        }
      }
      memoryStore.set(key, { value: String(nextVal), expiresAt });
      return [null, nextVal];
    });
    return this;
  }

  async exec(): Promise<Array<[Error | null, any]>> {
    return this.queue.map((fn) => fn());
  }
}

export class HybridRedisClient extends EventEmitter {
  private ioredis: Redis | null = null;
  public isRedisOnline = false;
  private hasWarned = false;

  constructor(url?: string) {
    super();
    this.setMaxListeners(100);
    const targetUrl = url || redisUrl;
    if (targetUrl) {
      try {
        this.ioredis = new Redis(targetUrl, {
          enableOfflineQueue: false, // Do not hang requests in memory queue if Redis is offline
          maxRetriesPerRequest: 1,
          retryStrategy(times: number) {
            if (times > 10) {
              console.warn('[Redis] Connection failed after 10 retries. Operating with In-Memory fallback store.');
              return null; // Stop retrying, operate seamlessly with in-memory fallback
            }
            return Math.min(times * 1000, 10000);
          },
        });

        this.ioredis.on('connect', () => {
          this.isRedisOnline = true;
        });

        this.ioredis.on('ready', () => {
          this.isRedisOnline = true;
          this.emit('ready');
        });

        this.ioredis.on('close', () => {
          this.isRedisOnline = false;
        });

        this.ioredis.on('error', (err: any) => {
          this.isRedisOnline = false;
          if (process.env.NODE_ENV === 'production') {
            console.error('[Redis Client Error]', err.message);
          } else if (!this.hasWarned) {
            this.hasWarned = true;
            console.warn('[Redis] Local Redis not detected. Operating seamlessly with In-Memory fallback store.');
          }
        });

        this.ioredis.on('message', (channel: string, message: string) => {
          this.emit('message', channel, message);
        });
      } catch (err: any) {
        this.isRedisOnline = false;
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isRedisOnline && this.ioredis) {
      try {
        return await this.ioredis.get(key);
      } catch {
        // Fallback to memory store
      }
    }
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string | number, ...args: any[]): Promise<'OK'> {
    if (this.isRedisOnline && this.ioredis) {
      try {
        await (this.ioredis as any).set(key, value, ...args);
      } catch {
        // Continue to set in memory store
      }
    }
    let ttlSeconds: number | null = null;
    if (args.length >= 2 && String(args[0]).toUpperCase() === 'EX') {
      ttlSeconds = Number(args[1]);
    }
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    memoryStore.set(key, { value: String(value), expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    if (this.isRedisOnline && this.ioredis) {
      try {
        await this.ioredis.del(...keys);
      } catch {
        // Fallback
      }
    }
    let count = 0;
    for (const k of keys) {
      if (memoryStore.delete(k)) count++;
    }
    return count;
  }

  async ttl(key: string): Promise<number> {
    if (this.isRedisOnline && this.ioredis) {
      try {
        return await this.ioredis.ttl(key);
      } catch {
        // Fallback
      }
    }
    const item = memoryStore.get(key);
    if (!item) return -2;
    if (item.expiresAt === null) return -1;
    const remainingMs = item.expiresAt - Date.now();
    if (remainingMs <= 0) {
      memoryStore.delete(key);
      return -2;
    }
    return Math.ceil(remainingMs / 1000);
  }

  async incr(key: string): Promise<number> {
    if (this.isRedisOnline && this.ioredis) {
      try {
        const val = await this.ioredis.incr(key);
        memoryStore.set(key, { value: String(val), expiresAt: null });
        return val;
      } catch {
        // Fallback
      }
    }
    const item = memoryStore.get(key);
    let nextVal = 1;
    let expiresAt: number | null = null;
    if (item) {
      if (item.expiresAt !== null && Date.now() > item.expiresAt) {
        memoryStore.delete(key);
      } else {
        nextVal = (parseInt(item.value, 10) || 0) + 1;
        expiresAt = item.expiresAt;
      }
    }
    memoryStore.set(key, { value: String(nextVal), expiresAt });
    return nextVal;
  }

  multi(): InMemoryPipeline {
    if (this.isRedisOnline && this.ioredis) {
      try {
        return (this.ioredis as any).multi();
      } catch {
        // Fallback
      }
    }
    return new InMemoryPipeline();
  }

  async publish(channel: string, message: string): Promise<number> {
    let count = 0;
    if (this.isRedisOnline && this.ioredis) {
      try {
        count = await this.ioredis.publish(channel, message);
      } catch {
        // Fallback
      }
    }
    memoryEventEmitter.emit(`channel:${channel}`, message);
    return count || 1;
  }

  subscribe(channel: string, cb?: Callback): this {
    if (this.isRedisOnline && this.ioredis) {
      try {
        if (cb) {
          this.ioredis.subscribe(channel, cb);
        } else {
          this.ioredis.subscribe(channel);
        }
      } catch (err: any) {
        if (cb) cb(err);
      }
    } else {
      if (cb) cb(null, 1);
    }
    memoryEventEmitter.on(`channel:${channel}`, (msg: string) => {
      this.emit('message', channel, msg);
    });
    return this;
  }

  async flushall(): Promise<'OK'> {
    if (this.isRedisOnline && this.ioredis) {
      try {
        await this.ioredis.flushall();
      } catch {}
    }
    memoryStore.clear();
    return 'OK';
  }
}

export const redisClient = new HybridRedisClient(redisUrl);
export const redisSubscriber = new HybridRedisClient(redisUrl);
