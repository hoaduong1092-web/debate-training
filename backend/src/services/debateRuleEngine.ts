export type DebateFormat = 'WSDC' | 'AP' | 'BP';
export type DebateSide = 'AFFIRMATIVE' | 'NEGATIVE';

export interface PoiRequest {
  id: string;
  offeredAtSecond: number;
  status: 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  durationSeconds: number;
}

export class DebateRuleEngine {
  /**
   * Kiểm tra xem thời điểm hiện tại có nằm trong Protected Time (không được phép xin POI) hay không.
   * Quy tắc: Khóa ở 60s đầu (0 - 60s) và 60s cuối (tổng thời lượng - 60s).
   */
  static isPoiAllowed(currentSpeechSeconds: number, totalSpeechDurationSeconds: number): boolean {
    if (totalSpeechDurationSeconds <= 120) {
      return false; // Bài nói dưới 2 phút không áp dụng POI
    }
    const isFirstMinute = currentSpeechSeconds < 60;
    const isLastMinute = currentSpeechSeconds > (totalSpeechDurationSeconds - 60);
    return !isFirstMinute && !isLastMinute;
  }

  /**
   * Validate thời lượng POI: Tối đa 15 giây cho một lần chất vấn.
   */
  static validatePoiDuration(durationSeconds: number): { valid: boolean; cutOffSeconds: number } {
    if (durationSeconds <= 0) return { valid: false, cutOffSeconds: 0 };
    if (durationSeconds > 15) {
      return { valid: false, cutOffSeconds: 15 }; // Tự động ngắt cứng ở giây thứ 15
    }
    return { valid: true, cutOffSeconds: durationSeconds };
  }

  /**
   * Lấy danh sách thứ tự người nói theo chuẩn thể thức WSDC
   */
  static getWsdcSpeakerOrder(): { speaker: string; side: DebateSide; isReply: boolean }[] {
    return [
      { speaker: 'Prop 1 (Prime Minister)', side: 'AFFIRMATIVE', isReply: false },
      { speaker: 'Opp 1 (Leader of Opposition)', side: 'NEGATIVE', isReply: false },
      { speaker: 'Prop 2 (Deputy Prime Minister)', side: 'AFFIRMATIVE', isReply: false },
      { speaker: 'Opp 2 (Deputy Leader of Opp)', side: 'NEGATIVE', isReply: false },
      { speaker: 'Prop 3 (Government Whip)', side: 'AFFIRMATIVE', isReply: false },
      { speaker: 'Opp 3 (Opposition Whip)', side: 'NEGATIVE', isReply: false },
      { speaker: 'Opp Reply (Opp 1 or 2)', side: 'NEGATIVE', isReply: true },
      { speaker: 'Prop Reply (Prop 1 or 2)', side: 'AFFIRMATIVE', isReply: true },
    ];
  }
}
