import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { SessionRegistry } from "../services/sessionRegistry";

const JWT_SECRET = process.env.JWT_SECRET ?? "ai-debate-master-jwt-secret-v15";
export const DEMO_USER_ID = "22222222-2222-2222-2222-222222222222";

export interface AuthRequest extends Request {
  userId: string;
  userEmail?: string;
  phoneNumber?: string;
  sessionId?: string;
  isDemo?: boolean;
  user?: {
    userId: string;
    phoneNumber?: string;
    sessionId?: string;
  };
}

/**
 * Strict authentication middleware — checks Bearer token, returns 401 if missing/invalid,
 * and validates active session against SessionRegistry (Single Active Session Enforcement).
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ success: false, error: "Chưa xác thực. Thiếu Authorization header." });
    return;
  }

  try {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      phoneNumber?: string;
      sessionId?: string;
    };

    // Enforce Active Session
    if (decoded.sessionId && !SessionRegistry.isActiveSession(decoded.userId, decoded.sessionId)) {
      res.status(401).json({
        success: false,
        error: "Phiên đăng nhập đã hết hiệu lực do có thiết bị khác đăng nhập.",
        code: "SESSION_REVOKED",
      });
      return;
    }

    (req as any).user = decoded;
    (req as any).userId = decoded.userId;
    (req as any).phoneNumber = decoded.phoneNumber;
    (req as any).sessionId = decoded.sessionId;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token không hợp lệ hoặc đã hết hạn." });
  }
};

/**
 * authenticate middleware — dual-mode:
 *  - No Authorization header  → fallback to DEMO_USER_ID (backward compatible)
 *  - Bearer <jwt>             → verify & extract userId & session
 *  - Invalid token            → fallback to DEMO_USER_ID (graceful degradation)
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    (req as AuthRequest).userId = DEMO_USER_ID;
    (req as AuthRequest).isDemo = true;
    next();
    return;
  }

  try {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      phoneNumber?: string;
      email?: string;
      sessionId?: string;
    };
    (req as AuthRequest).userId = decoded.userId;
    (req as AuthRequest).userEmail = decoded.email;
    (req as AuthRequest).phoneNumber = decoded.phoneNumber;
    (req as AuthRequest).sessionId = decoded.sessionId;
    (req as any).user = decoded;
    (req as AuthRequest).isDemo = false;
    next();
  } catch {
    // Invalid / expired token → graceful fallback to demo
    (req as AuthRequest).userId = DEMO_USER_ID;
    (req as AuthRequest).isDemo = true;
    next();
  }
};

/**
 * Generate a signed JWT for a user. Expiry: 30 days.
 */
export const generateToken = (userId: string, phoneNumberOrEmail: string, sessionId?: string): string => {
  return jwt.sign(
    {
      userId,
      phoneNumber: phoneNumberOrEmail.startsWith("+") ? phoneNumberOrEmail : undefined,
      email: !phoneNumberOrEmail.startsWith("+") ? phoneNumberOrEmail : undefined,
      sessionId,
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
};
