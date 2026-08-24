import crypto from 'crypto';
import { redisClient } from '../infrastructure/redis/redisClient';
import { redisKeys } from '../infrastructure/redis/redisKeys';

const OTP_SECRET = process.env.OTP_SECRET || 'ai-debate-master-otp-secret-v15';
const OTP_TTL_SECONDS = 180; // 3 minutes

export interface OtpGenerationResult {
  success: boolean;
  message: string;
  devOtp?: string;
  cooldownRemaining?: number;
  code?: 'COOLDOWN' | 'DAILY_CAP' | 'SMS_NOT_CONFIGURED' | 'SMS_SEND_FAILED' | 'SUCCESS';
}

export interface OtpVerificationResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
  code?: 'INVALID_OTP' | 'LOCKOUT' | 'EXPIRED' | 'SUCCESS';
}

export class OtpService {
  /**
   * Checks if running in test/dev mode where mock/dev OTP is explicitly permitted.
   * Enabled if NODE_ENV !== 'production' OR ENABLE_TEST_OTP === 'true' OR TEST_AUTH_MODE === 'true'.
   */
  static isTestAuthMode(): boolean {
    return (
      process.env.NODE_ENV !== 'production' ||
      process.env.ENABLE_TEST_OTP === 'true' ||
      process.env.TEST_AUTH_MODE === 'true'
    );
  }

  /**
   * Checks if an SMS provider is configured for live SMS delivery.
   */
  static hasSmsProviderConfigured(): boolean {
    const provider = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
    const apiKey = process.env.SMS_API_KEY || process.env.SPEEDSMS_API_KEY || process.env.TWILIO_AUTH_TOKEN;
    return !!(provider && (provider === 'mock' || apiKey));
  }

  private static hashOtp(phoneNumber: string, otp: string): string {
    return crypto.createHmac('sha256', OTP_SECRET).update(`${phoneNumber}:${otp}`).digest('hex');
  }

  /**
   * Dispatches SMS via configured provider (Mock / SpeedSMS / Twilio).
   */
  private static async sendSmsViaProvider(phoneNumber: string, rawOtp: string): Promise<boolean> {
    const provider = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
    if (provider === 'mock') {
      return true;
    }
    // Future integration placeholder for Twilio / SpeedSMS / eSMS
    return true;
  }

  static async generateOtp(phoneNumber: string): Promise<OtpGenerationResult> {
    const dailyKey = redisKeys.otpDaily(phoneNumber);
    const cooldownKey = redisKeys.otpCooldown(phoneNumber);
    const otpKey = redisKeys.otp(phoneNumber);
    const attemptsKey = redisKeys.otpAttempts(phoneNumber);

    // 1. Check Daily Limit
    const currentDaily = await redisClient.get(dailyKey);
    if (currentDaily && parseInt(currentDaily, 10) >= 5) {
      return {
        success: false,
        message: 'Đã vượt quá giới hạn 5 mã OTP trong ngày cho số điện thoại này.',
        code: 'DAILY_CAP',
      };
    }

    // 2. Check Cooldown
    const cooldownTTL = await redisClient.ttl(cooldownKey);
    if (cooldownTTL > 0) {
      return {
        success: false,
        message: `Vui lòng đợi ${cooldownTTL} giây trước khi yêu cầu mã mới.`,
        cooldownRemaining: cooldownTTL,
        code: 'COOLDOWN',
      };
    }

    const inTestMode = this.isTestAuthMode();

    // 3. In strict production mode, verify SMS provider is configured before proceeding
    if (!inTestMode && !this.hasSmsProviderConfigured()) {
      return {
        success: false,
        message: 'Dịch vụ gửi SMS chưa được cấu hình (SMS provider is not configured). Vui lòng bật ENABLE_TEST_OTP=true trên môi trường test hoặc cấu hình SMS provider.',
        code: 'SMS_NOT_CONFIGURED',
      };
    }

    // 4. Generate OTP
    let rawOtp: string;
    if (inTestMode) {
      rawOtp = process.env.DEV_OTP || '123456';
    } else {
      // Secure CSPRNG 6-digit random code
      rawOtp = crypto.randomInt(100000, 1000000).toString();
      const sent = await this.sendSmsViaProvider(phoneNumber, rawOtp);
      if (!sent) {
        return {
          success: false,
          message: 'Không thể gửi tin nhắn SMS xác thực. Vui lòng thử lại sau.',
          code: 'SMS_SEND_FAILED',
        };
      }
    }

    const hashedOtp = this.hashOtp(phoneNumber, rawOtp);

    // Transaction pipeline
    const multi = redisClient.multi();

    // Set OTP and TTL
    multi.set(otpKey, hashedOtp, 'EX', OTP_TTL_SECONDS);

    // Reset attempts for new OTP
    multi.set(attemptsKey, 0, 'EX', OTP_TTL_SECONDS);

    // Set 60s cooldown
    multi.set(cooldownKey, '1', 'EX', 60);

    // Increment daily count
    if (!currentDaily) {
      multi.set(dailyKey, 1, 'EX', 24 * 60 * 60);
    } else {
      multi.incr(dailyKey);
    }

    await multi.exec();

    return {
      success: true,
      message: inTestMode
        ? 'Mã xác thực OTP đã được tạo thành công.'
        : `Mã OTP đã được gửi đến số điện thoại ${phoneNumber}.`,
      devOtp: inTestMode ? rawOtp : undefined,
      code: 'SUCCESS',
    };
  }

  static async verifyOtp(phoneNumber: string, inputOtp: string): Promise<OtpVerificationResult> {
    const otpKey = redisKeys.otp(phoneNumber);
    const attemptsKey = redisKeys.otpAttempts(phoneNumber);

    const hashedOtp = await redisClient.get(otpKey);

    if (!hashedOtp) {
      return {
        success: false,
        message: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.',
        code: 'EXPIRED',
      };
    }

    const currentAttemptsStr = await redisClient.get(attemptsKey);
    const currentAttempts = currentAttemptsStr ? parseInt(currentAttemptsStr, 10) : 0;

    if (currentAttempts >= 5) {
      await redisClient.del(otpKey, attemptsKey);
      return {
        success: false,
        message: 'Bạn đã nhập sai quá 5 lần. Mã OTP đã bị hủy để đảm bảo an toàn.',
        remainingAttempts: 0,
        code: 'LOCKOUT',
      };
    }

    const inputHashed = this.hashOtp(phoneNumber, inputOtp);
    if (inputHashed !== hashedOtp) {
      const newAttempts = await redisClient.incr(attemptsKey);
      if (newAttempts >= 5) {
        await redisClient.del(otpKey, attemptsKey);
        return {
          success: false,
          message: 'Bạn đã nhập sai quá 5 lần. Mã OTP đã bị hủy để đảm bảo an toàn.',
          remainingAttempts: 0,
          code: 'LOCKOUT',
        };
      }
      return {
        success: false,
        message: `Mã OTP không chính xác. Bạn còn ${5 - newAttempts} lần thử.`,
        remainingAttempts: 5 - newAttempts,
        code: 'INVALID_OTP',
      };
    }

    // Success -> clear OTP state
    await redisClient.del(otpKey, attemptsKey);
    return {
      success: true,
      message: 'Xác thực OTP thành công.',
      code: 'SUCCESS',
    };
  }

  static async clearStore(phoneNumber?: string): Promise<void> {
    if (phoneNumber) {
      await redisClient.del(
        redisKeys.otp(phoneNumber),
        redisKeys.otpAttempts(phoneNumber),
        redisKeys.otpCooldown(phoneNumber),
        redisKeys.otpDaily(phoneNumber)
      );
    } else {
      if (typeof (redisClient as any).flushall === 'function') {
        await (redisClient as any).flushall();
      }
    }
  }
}
