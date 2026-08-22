import { Request, Response, NextFunction } from 'express';
import { PhoneValidator } from '../utils/phoneValidator';

interface RateLimitEntry {
  requests: number[];
}

const ipRequestMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

/**
 * IP and endpoint-level rate limiter middleware to prevent spamming.
 */
export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();

  let entry = ipRequestMap.get(ip);
  if (!entry) {
    entry = { requests: [] };
    ipRequestMap.set(ip, entry);
  }

  // Filter timestamps within window
  entry.requests = entry.requests.filter((time) => now - time < WINDOW_MS);

  if (entry.requests.length >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      success: false,
      error: 'Quá nhiều yêu cầu từ địa chỉ IP này. Vui lòng thử lại sau 1 phút.',
    });
    return;
  }

  entry.requests.push(now);
  next();
}
