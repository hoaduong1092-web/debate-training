import crypto from 'crypto';
import { redisClient } from '../infrastructure/redis/redisClient';
import { redisKeys } from '../infrastructure/redis/redisKeys';

const OTP_SECRET = process.env.OTP_SECRET || 'ai-debate-master-otp-secret-v15';
const OTP_TTL_SECONDS = 180; // 3 minutes

export class OtpService {
  private static hashOtp(phoneNumber: string, otp: string): string {
    return crypto.createHmac('sha256', OTP_SECRET).update(`${phoneNumber}:${otp}`).digest('hex');
  }

  static async generateOtp(phoneNumber: string): Promise<{ success: boolean; message: string; otp?: string; cooldownRemaining?: number }> {
    const dailyKey = redisKeys.otpDaily(phoneNumber);
    const cooldownKey = redisKeys.otpCooldown(phoneNumber);
    const otpKey = redisKeys.otp(phoneNumber);
    const attemptsKey = redisKeys.otpAttempts(phoneNumber);

    // 1. Check Daily Limit
    const currentDaily = await redisClient.get(dailyKey);
    if (currentDaily && parseInt(currentDaily, 10) >= 5) {
      return { success: false, message: 'Đã vượt quá giới hạn 5 mã OTP trong ngày cho số điện thoại này.' };
    }

    // 2. Check Cooldown
    const cooldownTTL = await redisClient.ttl(cooldownKey);
    if (cooldownTTL > 0) {
      return {
        success: false,
        message: `Vui lòng đợi ${cooldownTTL} giây trước khi yêu cầu mã mới.`,
        cooldownRemaining: cooldownTTL,
      };
    }

    // Generate OTP
    const rawOtp = process.env.NODE_ENV === 'production' 
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456';
    
    const hashedOtp = this.hashOtp(phoneNumber, rawOtp);

    // Transaction pipeline
    const multi = redisClient.multi();
    
    // Set OTP and TTL
    multi.set(otpKey, hashedOtp, 'EX', OTP_TTL_SECONDS);
    
    // Reset attempts for new OTP
    multi.set(attemptsKey, 0, 'EX', OTP_TTL_SECONDS);
    
    // Set 60s cooldown
    multi.set(cooldownKey, '1', 'EX', 60);
    
    // Increment daily count. If key doesn't exist, we set it with 24h expiry manually later
    if (!currentDaily) {
      // Get ms to next midnight or just simple 24h
      multi.set(dailyKey, 1, 'EX', 24 * 60 * 60);
    } else {
      multi.incr(dailyKey);
    }
    
    await multi.exec();

    return {
      success: true,
      message: 'Mã xác thực OTP đã được tạo thành công.',
      otp: process.env.NODE_ENV === 'production' ? undefined : rawOtp,
    };
  }

  static async verifyOtp(phoneNumber: string, inputOtp: string): Promise<{ success: boolean; message: string }> {
    const otpKey = redisKeys.otp(phoneNumber);
    const attemptsKey = redisKeys.otpAttempts(phoneNumber);

    const hashedOtp = await redisClient.get(otpKey);
    
    if (!hashedOtp) {
      return { success: false, message: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.' };
    }

    const currentAttemptsStr = await redisClient.get(attemptsKey);
    const currentAttempts = currentAttemptsStr ? parseInt(currentAttemptsStr, 10) : 0;

    if (currentAttempts >= 5) {
      await redisClient.del(otpKey, attemptsKey);
      return { success: false, message: 'Bạn đã nhập sai quá 5 lần. Mã OTP đã bị hủy để đảm bảo an toàn.' };
    }

    const inputHashed = this.hashOtp(phoneNumber, inputOtp);
    if (inputHashed !== hashedOtp) {
      const newAttempts = await redisClient.incr(attemptsKey);
      return { success: false, message: `Mã OTP không chính xác. Bạn còn ${5 - newAttempts} lần thử.` };
    }

    // Success -> clear OTP state
    await redisClient.del(otpKey, attemptsKey);
    return { success: true, message: 'Xác thực OTP thành công.' };
  }

  static async clearStore(phoneNumber: string): Promise<void> {
    await redisClient.del(
      redisKeys.otp(phoneNumber),
      redisKeys.otpAttempts(phoneNumber),
      redisKeys.otpCooldown(phoneNumber),
      redisKeys.otpDaily(phoneNumber)
    );
  }
}
