import { PrismaClient } from '@prisma/client';

export class QuotaService {
  /**
   * Trừ lượt Text Turn nguyên tử (Atomic decrement with condition >= 1)
   */
  static async deductTextTurn(prisma: PrismaClient, userId: string): Promise<boolean> {
    const updatedCount = await prisma.$executeRaw`
      UPDATE user_quotas
      SET text_turns_remaining = text_turns_remaining - 1
      WHERE user_id = ${userId}::uuid AND text_turns_remaining >= 1
    `;
    return updatedCount > 0;
  }

  /**
   * Trừ thời lượng Voice (phút) nguyên tử
   */
  static async deductVoiceMins(prisma: PrismaClient, userId: string, mins: number = 1): Promise<boolean> {
    const updatedCount = await prisma.$executeRaw`
      UPDATE user_quotas
      SET voice_mins_remaining = voice_mins_remaining - ${mins}
      WHERE user_id = ${userId}::uuid AND voice_mins_remaining >= ${mins}
    `;
    return updatedCount > 0;
  }

  /**
   * Trừ lượt Trợ lý (Assistant request) nguyên tử
   */
  static async deductAssistantTurn(prisma: PrismaClient, userId: string): Promise<boolean> {
    const updatedCount = await prisma.$executeRaw`
      UPDATE user_quotas
      SET assistant_remaining = assistant_remaining - 1
      WHERE user_id = ${userId}::uuid AND assistant_remaining >= 1
    `;
    return updatedCount > 0;
  }

  /**
   * Lấy số dư Quota hiện tại của người dùng
   */
  static async getUserQuota(prisma: PrismaClient, userId: string) {
    return prisma.userQuota.findUnique({
      where: { userId },
    });
  }
}
