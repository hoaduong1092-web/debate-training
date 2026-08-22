import { VoiceDspMetrics } from '../services/voiceDspService';

export function buildVoiceCoachPrompt(metrics: VoiceDspMetrics, userSpeech: string): string {
  return `Bạn là Giám Khảo & Huấn Luyện Viên Giọng Nói (Voice Coach) chuyên nghiệp trong tranh biện theo chuẩn Blueprint v15.0.0.
Dưới đây là các chỉ số âm thanh thực tế đã được đo lường chính xác từ bài phát biểu của người học:

[THỐNG KÊ ÂM THANH ĐO BẰNG DSP]
- Tốc độ phát âm (WPM): ${metrics.wpm} từ/phút (Chuẩn tranh luận tiếng Việt tối ưu: 120 - 160 WPM).
- Đánh giá nhịp độ: ${metrics.paceEvaluation}
- Tổng số từ phát âm: ${metrics.wordCount} từ trong ${Math.round(metrics.durationMs / 1000)} giây.
- Số lần ngắc ngứ / ngắt nghỉ kéo dài (>1.2s): ${metrics.pauseCount} lần.
- Số lượng từ đệm phát hiện: ${metrics.fillerWordsCount} (Chi tiết: ${metrics.fillerWordsList.map(f => `"${f.word}": ${f.count}`).join(', ') || 'Không có'}).

[BÀI PHÁT BIỂU CỦA NGƯỜI HỌC]
"${userSpeech}"

[YÊU CẦU ĐÁNH GIÁ]
1. Nhận xét định tính về độ lưu loát, năng lượng và kiểm soát hơi thở dựa trên các chỉ số WPM và từ đệm ở trên.
2. Đưa ra 2 bài tập rèn luyện cụ thể giúp người học khắc phục nhịp độ hoặc giảm bớt từ đệm ở lượt nói tiếp theo.
3. Luôn giữ phong thái động viên, truyền cảm hứng và tính sư phạm chuẩn mực.`;
}
