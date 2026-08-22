import crypto from 'crypto';

interface OtpRecord {
  hashedOtp: string;
  expiresAt: number;
  attempts: number;
  lastRequestedAt: number;
  dailyCount: number;
  dailyResetAt: number;
}

const OTP_STORE = new Map<string, OtpRecord>();
const OTP_SECRET = process.env.OTP_SECRET || 'ai-debate-master-otp-secret-v15';

export class OtpService {
  private static hashOtp(phoneNumber: string, otp: string): string {
    return crypto.createHmac('sha256', OTP_SECRET).update(`${phoneNumber}:${otp}`).digest('hex');
  }

  static generateOtp(phoneNumber: string): { success: boolean; message: string; otp?: string; cooldownRemaining?: number } {
    const now = Date.now();
    let record = OTP_STORE.get(phoneNumber);

    if (record) {
      if (now > record.dailyResetAt) {
        record.dailyCount = 0;
        record.dailyResetAt = now + 24 * 60 * 60 * 1000;
      }
      if (record.dailyCount >= 5) {
        return { success: false, message: 'Đã vượt quá giới hạn 5 mã OTP trong ngày cho số điện thoại này.' };
      }
      const timeSinceLast = (now - record.lastRequestedAt) / 1000;
      if (timeSinceLast < 60) {
        return {
          success: false,
          message: `Vui lòng đợi ${Math.ceil(60 - timeSinceLast)} giây trước khi yêu cầu mã mới.`,
          cooldownRemaining: Math.ceil(60 - timeSinceLast),
        };
      }
    } else {
      record = {
        hashedOtp: '',
        expiresAt: 0,
        attempts: 0,
        lastRequestedAt: 0,
        dailyCount: 0,
        dailyResetAt: now + 24 * 60 * 60 * 1000,
      };
    }

    const rawOtp = process.env.NODE_ENV === 'production' 
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456'; // Default deterministic OTP in dev/test

    record.hashedOtp = this.hashOtp(phoneNumber, rawOtp);
    record.expiresAt = now + 3 * 60 * 1000; // TTL 3 mins
    record.attempts = 0;
    record.lastRequestedAt = now;
    record.dailyCount += 1;

    OTP_STORE.set(phoneNumber, record);

    return {
      success: true,
      message: 'Mã xác thực OTP đã được tạo thành công.',
      otp: process.env.NODE_ENV === 'production' ? undefined : rawOtp,
    };
  }

  static verifyOtp(phoneNumber: string, inputOtp: string): { success: boolean; message: string } {
    const now = Date.now();
    const record = OTP_STORE.get(phoneNumber);

    if (!record || !record.hashedOtp) {
      return { success: false, message: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.' };
    }

    if (now > record.expiresAt) {
      OTP_STORE.delete(phoneNumber);
      return { success: false, message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu lại.' };
    }

    if (record.attempts >= 5) {
      OTP_STORE.delete(phoneNumber);
      return { success: false, message: 'Bạn đã nhập sai quá 5 lần. Mã OTP đã bị hủy để đảm bảo an toàn.' };
    }

    const inputHashed = this.hashOtp(phoneNumber, inputOtp);
    if (inputHashed !== record.hashedOtp) {
      record.attempts += 1;
      OTP_STORE.set(phoneNumber, record);
      return { success: false, message: `Mã OTP không chính xác. Bạn còn ${5 - record.attempts} lần thử.` };
    }

    OTP_STORE.delete(phoneNumber);
    return { success: true, message: 'Xác thực OTP thành công.' };
  }

  static clearStore(): void {
    OTP_STORE.clear();
  }
}
