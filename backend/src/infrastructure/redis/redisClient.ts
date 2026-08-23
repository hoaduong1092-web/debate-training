import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (process.env.NODE_ENV === 'production' && !redisUrl) {
  console.error('FATAL: REDIS_URL is mandatory in production.');
  process.exit(1);
}

const defaultOptions = {
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    if (process.env.NODE_ENV === 'production') {
      if (times > 5) {
        console.error('FATAL: Redis connection failed in production after 5 retries. Exiting.');
        process.exit(1);
      }
    }
    const delay = Math.min(times * 500, 5000);
    return delay;
  },
};

// Fallback to localhost for development if REDIS_URL is missing
export const redisClient = new Redis(redisUrl || 'redis://localhost:6379', defaultOptions);
export const redisSubscriber = new Redis(redisUrl || 'redis://localhost:6379', defaultOptions);

// Prevent unhandled error event exceptions when Redis is offline
let hasWarnedClient = false;
redisClient.on('error', (err: any) => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Redis Client Error]', err.message);
  } else if (!hasWarnedClient) {
    hasWarnedClient = true;
    console.warn('[Redis] Local Redis not detected on localhost:6379. (Dev Mode: Start Redis or set REDIS_URL in .env to use live OTP/session features).');
  }
});

let hasWarnedSub = false;
redisSubscriber.on('error', (err: any) => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Redis Subscriber Error]', err.message);
  } else if (!hasWarnedSub) {
    hasWarnedSub = true;
  }
});
