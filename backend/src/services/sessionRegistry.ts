import { redisClient } from '../infrastructure/redis/redisClient';
import { redisKeys } from '../infrastructure/redis/redisKeys';
import { WebSocket } from 'ws';

export interface ActiveSession {
  userId: string;
  sessionId: string;
  socket?: WebSocket | null;
  updatedAt: number;
}

export class SessionRegistry {
  // Local process memory for WebSocket connection objects ONLY
  private static localSockets = new Map<string, WebSocket>();

  /**
   * Đăng ký hoặc ghi đè phiên hoạt động cho User trong Redis.
   * Nếu có phiên cũ, trả về sessionId cũ để kích hoạt Gentle Eviction.
   */
  static async registerSession(userId: string, sessionId: string): Promise<ActiveSession | null> {
    const key = redisKeys.activeSession(userId);
    const oldSessionId = await redisClient.get(key);
    
    // Set active session in Redis with 30d expiry to match token
    await redisClient.set(key, sessionId, 'EX', 30 * 24 * 60 * 60);

    if (oldSessionId && oldSessionId !== sessionId) {
      const socket = this.localSockets.get(oldSessionId);
      return {
        userId,
        sessionId: oldSessionId,
        socket: socket || null,
        updatedAt: Date.now(),
      };
    }
    return null;
  }

  /**
   * Cập nhật WebSocket connection cho session hiện tại trong process local memory
   */
  static bindSocket(sessionId: string, socket: WebSocket): boolean {
    this.localSockets.set(sessionId, socket);
    return true;
  }

  /**
   * Lấy local socket (nếu có) của một sessionId
   */
  static getLocalSocket(sessionId: string): WebSocket | undefined {
    return this.localSockets.get(sessionId);
  }

  /**
   * Xóa local socket
   */
  static removeLocalSocket(sessionId: string): void {
    this.localSockets.delete(sessionId);
  }

  /**
   * Kiểm tra session có phải là phiên hoạt động duy nhất hợp lệ không (Redis check)
   */
  static async isActiveSession(userId: string, sessionId: string): Promise<boolean> {
    const key = redisKeys.activeSession(userId);
    const activeSessionId = await redisClient.get(key);
    if (!activeSessionId) return true; // Nếu chưa có bản ghi (e.g. dev or cleared), cho phép
    return activeSessionId === sessionId;
  }

  /**
   * Xóa phiên hoạt động khi đăng xuất
   */
  static async removeSession(userId: string, sessionId: string): Promise<void> {
    const key = redisKeys.activeSession(userId);
    const activeSessionId = await redisClient.get(key);
    if (activeSessionId === sessionId) {
      await redisClient.del(key);
    }
  }

  /**
   * Lấy sessionId đang active của User
   */
  static async getActiveSessionId(userId: string): Promise<string | null> {
    const key = redisKeys.activeSession(userId);
    return await redisClient.get(key);
  }

  /**
   * Reset registry (dùng cho unit test)
   */
  static async clear(userId?: string): Promise<void> {
    if (userId) {
      const key = redisKeys.activeSession(userId);
      await redisClient.del(key);
    } else {
      if (typeof (redisClient as any).flushall === 'function') {
        await (redisClient as any).flushall();
      }
      this.localSockets.clear();
    }
  }
}
