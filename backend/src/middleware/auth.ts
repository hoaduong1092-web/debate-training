import jwt, { SignOptions } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { SessionRegistry } from "../services/sessionRegistry";

const JWT_SECRET = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is mandatory in production.");
  process.exit(1);
}
export const ACTUAL_JWT_SECRET = JWT_SECRET || "ai-debate-master-jwt-secret-v15";
const JWT_EXPIRES: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES as SignOptions["expiresIn"]) || "30d";

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

const applyDemoFallback = (req: Request, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO === 'true') {
    (req as AuthRequest).userId = DEMO_USER_ID;
    (req as AuthRequest).isDemo = true;
    next();
  } else {
    next(new Error('Unauthorized')); // Signal to return 401
  }
};

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
    const decoded = jwt.verify(token, ACTUAL_JWT_SECRET) as {
      userId: string;
      phoneNumber?: string;
      sessionId?: string;
    };

    // Enforce Active Session
    const isActive = await SessionRegistry.isActiveSession(decoded.userId, decoded.sessionId || '');
    if (decoded.sessionId && !isActive) {
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
 * authenticate middleware
 * In production: strictly calls authenticateToken (NO fallback).
 * In development (with ENABLE_DEMO=true): allows fallback to DEMO_USER_ID if no token/invalid token.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO === 'true') {
      (req as AuthRequest).userId = DEMO_USER_ID;
      (req as AuthRequest).isDemo = true;
      next();
      return;
    }
    res.status(401).json({ success: false, error: "Chưa xác thực. Thiếu Authorization header." });
    return;
  }

  try {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    const decoded = jwt.verify(token, ACTUAL_JWT_SECRET) as {
      userId: string;
      phoneNumber?: string;
      email?: string;
      sessionId?: string;
    };
    
    // Enforce Active Session
    const isActive = await SessionRegistry.isActiveSession(decoded.userId, decoded.sessionId || '');
    if (decoded.sessionId && !isActive) {
      res.status(401).json({
        success: false,
        error: "Phiên đăng nhập đã hết hiệu lực do có thiết bị khác đăng nhập.",
        code: "SESSION_REVOKED",
      });
      return;
    }

    (req as AuthRequest).userId = decoded.userId;
    (req as AuthRequest).userEmail = decoded.email;
    (req as AuthRequest).phoneNumber = decoded.phoneNumber;
    (req as AuthRequest).sessionId = decoded.sessionId;
    (req as any).user = decoded;
    (req as AuthRequest).isDemo = false;
    next();
  } catch {
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO === 'true') {
      (req as AuthRequest).userId = DEMO_USER_ID;
      (req as AuthRequest).isDemo = true;
      next();
      return;
    }
    res.status(401).json({ success: false, error: "Token không hợp lệ hoặc đã hết hạn." });
  }
};

/**
 * Generate a signed JWT for a user.
 */
export const generateToken = (userId: string, phoneNumberOrEmail: string, sessionId?: string): string => {
  return jwt.sign(
    {
      userId,
      phoneNumber: phoneNumberOrEmail.startsWith("+") ? phoneNumberOrEmail : undefined,
      email: !phoneNumberOrEmail.startsWith("+") ? phoneNumberOrEmail : undefined,
      sessionId,
    },
    ACTUAL_JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
};
