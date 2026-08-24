import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PhoneValidator } from '../utils/phoneValidator';
import { OtpService } from '../services/otpService';
import { SessionRegistry } from '../services/sessionRegistry';
import { SessionSocketHandler } from '../websocket/sessionSocketHandler';
import { generateToken } from '../middleware/auth';

const prisma = new PrismaClient();

export class AuthController {
  static async requestOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.body;
      const normalizedPhone = PhoneValidator.normalizeE164(phone);

      if (!normalizedPhone) {
        res.status(400).json({ success: false, error: 'Số điện thoại không hợp lệ theo chuẩn quốc tế E.164 (+84...)' });
        return;
      }

      const result = await OtpService.generateOtp(normalizedPhone);
      if (!result.success) {
        let statusCode = 400;
        if (result.code === 'COOLDOWN' || result.code === 'DAILY_CAP') {
          statusCode = 429;
        } else if (result.code === 'SMS_NOT_CONFIGURED' || result.code === 'SMS_SEND_FAILED') {
          statusCode = 503;
        }
        res.status(statusCode).json({
          success: false,
          error: result.message,
          code: result.code,
          cooldownRemaining: result.cooldownRemaining,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        phone: normalizedPhone,
        ...(result.devOtp ? { devOtp: result.devOtp } : {}),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi xử lý gửi OTP' });
    }
  }

  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone, otp, displayName } = req.body;
      const normalizedPhone = PhoneValidator.normalizeE164(phone);

      if (!normalizedPhone || !otp) {
        res.status(400).json({ success: false, error: 'Thiếu số điện thoại hoặc mã OTP.' });
        return;
      }

      const verifyResult = await OtpService.verifyOtp(normalizedPhone, otp);
      if (!verifyResult.success) {
        res.status(400).json({
          success: false,
          error: verifyResult.message,
          code: verifyResult.code,
          remainingAttempts: verifyResult.remainingAttempts,
        });
        return;
      }

      // Find or create User with starter quota
      let user = await prisma.user.findUnique({
        where: { phoneNumber: normalizedPhone },
        include: { quota: true, subscription: true },
      });

      if (!user) {
        const defaultName = displayName || `Tranh Biện Viên ${normalizedPhone.slice(-4)}`;
        user = await prisma.user.create({
          data: {
            phoneNumber: normalizedPhone,
            displayName: defaultName,
            quota: {
              create: {
                textTurnsRemaining: 30,
                voiceMinsRemaining: 15,
                assistantRemaining: 10,
              },
            },
          },
          include: { quota: true, subscription: true },
        });
      }

      const sessionId = randomUUID();

      // Register new active session and trigger Gentle Eviction for any existing session
      const oldSessionId = await SessionRegistry.registerSession(user.id, sessionId);
      if (oldSessionId) {
        SessionSocketHandler.notifyGentleEviction(oldSessionId, sessionId);
      }

      const token = generateToken(user.id, user.phoneNumber, sessionId);

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công.',
        token,
        sessionId,
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          quota: user.quota,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi xác thực OTP' });
    }
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Chưa xác thực.' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { quota: true, subscription: { include: { plan: true } } },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'Không tìm thấy thông tin người dùng.' });
        return;
      }

      res.status(200).json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
