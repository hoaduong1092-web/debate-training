export const redisKeys = {
  otp: (phone: string) => `auth:otp:${phone}`,
  otpAttempts: (phone: string) => `auth:otp:attempts:${phone}`,
  otpCooldown: (phone: string) => `auth:otp:cooldown:${phone}`,
  otpDaily: (phone: string) => `auth:otp:daily:${phone}`,
  activeSession: (userId: string) => `user:${userId}:active_session`,
};
