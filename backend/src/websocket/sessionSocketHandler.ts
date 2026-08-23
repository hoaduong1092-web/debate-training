import { WebSocket } from 'ws';
import { SessionRegistry } from '../services/sessionRegistry';
import { redisClient, redisSubscriber } from '../infrastructure/redis/redisClient';

export class SessionSocketHandler {
  static initSubscriber() {
    redisSubscriber.subscribe('session_eviction', (err) => {
      if (err) {
        if (process.env.NODE_ENV === 'production') {
          console.error('[WS Eviction] Failed to subscribe to Redis channel', err);
        } else {
          console.warn('[WS Eviction] Pub/Sub subscription pending Redis connection.');
        }
      }
    });

    redisSubscriber.on('message', (channel, message) => {
      if (channel === 'session_eviction') {
        try {
          const { oldSessionId, newSessionId } = JSON.parse(message);
          this.triggerLocalEviction(oldSessionId, newSessionId);
        } catch (e) {
          console.error('[WS Eviction] Failed to parse message', e);
        }
      }
    });
  }

  /**
   * Broadcasts eviction to all instances via Redis Pub/Sub
   */
  static notifyGentleEviction(oldSessionId: string, newSessionId: string): void {
    redisClient.publish('session_eviction', JSON.stringify({ oldSessionId, newSessionId }))
      .catch(err => console.error('[WS Eviction] Failed to publish', err));
  }

  /**
   * Handles local eviction logic if the socket is connected to this instance
   */
  private static triggerLocalEviction(oldSessionId: string, newSessionId: string): void {
    const socket = SessionRegistry.getLocalSocket(oldSessionId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      const evictionPayload = JSON.stringify({
        type: 'SESSION_REPLACED',
        event: 'GENTLE_EVICTION',
        message: 'Tài khoản của bạn vừa được kết nối ở một thiết bị khác. Phiên hoạt động hiện tại đã bị thay thế để bảo vệ hồ sơ tư duy cá nhân của bạn.',
        timestamp: new Date().toISOString(),
        replacedBySessionId: newSessionId,
      });

      try {
        socket.send(evictionPayload);
        // Đóng socket sau khi đã gửi thông điệp êm dịu (Gentle Drain 500ms)
        setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close(4001, 'SESSION_REPLACED');
          }
          SessionRegistry.removeLocalSocket(oldSessionId);
        }, 500);
      } catch (err) {
        console.error('[WS Eviction] Error notifying old session:', err);
      }
    }
  }
}
