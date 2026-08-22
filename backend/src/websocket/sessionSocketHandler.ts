import { WebSocket } from 'ws';
import { ActiveSession } from '../services/sessionRegistry';

export class SessionSocketHandler {
  /**
   * Gửi thông báo SESSION_REPLACED tới thiết bị cũ một cách êm thuận (Gentle Drain)
   */
  static notifyGentleEviction(oldSession: ActiveSession, newSessionId: string): void {
    if (oldSession.socket && oldSession.socket.readyState === WebSocket.OPEN) {
      const evictionPayload = JSON.stringify({
        type: 'SESSION_REPLACED',
        event: 'GENTLE_EVICTION',
        message: 'Tài khoản của bạn vừa được kết nối ở một thiết bị khác. Phiên hoạt động hiện tại đã bị thay thế để bảo vệ hồ sơ tư duy cá nhân của bạn.',
        timestamp: new Date().toISOString(),
        replacedBySessionId: newSessionId,
      });

      try {
        oldSession.socket.send(evictionPayload);
        // Đóng socket sau khi đã gửi thông điệp êm dịu (Gentle Drain 500ms)
        setTimeout(() => {
          if (oldSession.socket && oldSession.socket.readyState === WebSocket.OPEN) {
            oldSession.socket.close(4001, 'SESSION_REPLACED');
          }
        }, 500);
      } catch (err) {
        console.error('[WS Eviction] Error notifying old session:', err);
      }
    }
  }
}
