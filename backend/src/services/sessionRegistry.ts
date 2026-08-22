import { WebSocket } from 'ws';

export interface ActiveSession {
  userId: string;
  sessionId: string;
  socket?: WebSocket | null;
  updatedAt: number;
}

export class SessionRegistry {
  private static sessions = new Map<string, ActiveSession>();

  /**
   * Đăng ký hoặc ghi đè phiên hoạt động cho User.
   * Nếu có phiên cũ, trả về thông tin phiên cũ để kích hoạt Gentle Eviction.
   */
  static registerSession(userId: string, sessionId: string, socket: WebSocket | null = null): ActiveSession | null {
    const oldSession = this.sessions.get(userId) || null;
    
    this.sessions.set(userId, {
      userId,
      sessionId,
      socket,
      updatedAt: Date.now(),
    });

    return oldSession && oldSession.sessionId !== sessionId ? oldSession : null;
  }

  /**
   * Cập nhật WebSocket connection cho session hiện tại
   */
  static bindSocket(userId: string, sessionId: string, socket: WebSocket): boolean {
    const session = this.sessions.get(userId);
    if (session && session.sessionId === sessionId) {
      session.socket = socket;
      return true;
    }
    return false;
  }

  /**
   * Kiểm tra session có phải là phiên hoạt động duy nhất hợp lệ
   */
  static isActiveSession(userId: string, sessionId: string): boolean {
    const session = this.sessions.get(userId);
    if (!session) return true; // Nếu chưa có bản ghi (dev/cold start), cho phép fallback hợp lệ
    return session.sessionId === sessionId;
  }

  /**
   * Lấy sessionId đang active của User
   */
  static getActiveSessionId(userId: string): string | null {
    return this.sessions.get(userId)?.sessionId || null;
  }

  /**
   * Xóa phiên hoạt động khi đăng xuất
   */
  static removeSession(userId: string, sessionId: string): void {
    const session = this.sessions.get(userId);
    if (session && session.sessionId === sessionId) {
      this.sessions.delete(userId);
    }
  }

  /**
   * Reset registry (dùng cho unit test)
   */
  static clear(): void {
    this.sessions.clear();
  }
}
