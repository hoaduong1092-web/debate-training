export interface WordTimestamp {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface VoiceDspMetrics {
  durationMs: number;
  wordCount: number;
  wpm: number;
  fillerWordsCount: number;
  fillerWordsList: { word: string; count: number }[];
  pauseCount: number;
  longSilenceDurationMs: number;
  paceEvaluation: 'TOO_SLOW' | 'OPTIMAL' | 'TOO_FAST';
}

export class VoiceDspService {
  // Danh mục từ đệm tiếng Việt phổ biến trong tranh biện
  private static readonly VIETNAMESE_FILLERS = [
    'ờ', 'à', 'ừ', 'ừm', 'ơ', 'kiểu', 'kiểu như', 'thì là', 'ý là', 'cái gì nhỉ', 'thế này nhé'
  ];

  /**
   * Tính toán chỉ số giọng nói thuần túy từ văn bản và thời lượng (fallback khi không có timestamp)
   */
  static computeFromText(text: string, durationMs: number): VoiceDspMetrics {
    const cleanText = text.trim();
    if (!cleanText || durationMs <= 0) {
      return {
        durationMs: Math.max(0, durationMs),
        wordCount: 0,
        wpm: 0,
        fillerWordsCount: 0,
        fillerWordsList: [],
        pauseCount: 0,
        longSilenceDurationMs: 0,
        paceEvaluation: 'TOO_SLOW',
      };
    }

    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const durationMinutes = durationMs / 60000;
    const wpm = durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0;

    // Đếm từ đệm tiếng Việt
    const fillerMap = new Map<string, number>();
    let totalFillers = 0;
    const lowerText = cleanText.toLowerCase();

    for (const filler of this.VIETNAMESE_FILLERS) {
      const regex = new RegExp(`(^|\\s)${filler}(?=[\\s,\\.\\?!]|$)`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        fillerMap.set(filler, matches.length);
        totalFillers += matches.length;
      }
    }

    const fillerWordsList = Array.from(fillerMap.entries()).map(([word, count]) => ({ word, count }));

    let paceEvaluation: 'TOO_SLOW' | 'OPTIMAL' | 'TOO_FAST' = 'OPTIMAL';
    if (wpm < 110) {
      paceEvaluation = 'TOO_SLOW';
    } else if (wpm > 175) {
      paceEvaluation = 'TOO_FAST';
    }

    return {
      durationMs,
      wordCount,
      wpm,
      fillerWordsCount: totalFillers,
      fillerWordsList,
      pauseCount: 0,
      longSilenceDurationMs: 0,
      paceEvaluation,
    };
  }

  /**
   * Phân tích sâu theo Word Timestamps trích xuất từ Whisper / STT Engine
   */
  static computeFromTimestamps(words: WordTimestamp[], totalDurationMs: number): VoiceDspMetrics {
    if (!words || words.length === 0) {
      return this.computeFromText('', totalDurationMs);
    }

    const wordCount = words.length;
    const durationMs = totalDurationMs > 0 ? totalDurationMs : (words[words.length - 1].end * 1000);
    const durationMinutes = durationMs / 60000;
    const wpm = durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0;

    // Phân tích khoảng ngắt nghỉ giữa các từ (Pause Detection)
    let pauseCount = 0;
    let longSilenceDurationMs = 0;

    for (let i = 0; i < words.length - 1; i++) {
      const gapSeconds = words[i + 1].start - words[i].end;
      if (gapSeconds >= 1.2) {
        pauseCount++;
        longSilenceDurationMs += Math.round(gapSeconds * 1000);
      }
    }

    const fullText = words.map(w => w.word).join(' ');
    const textMetrics = this.computeFromText(fullText, durationMs);

    return {
      ...textMetrics,
      durationMs,
      wordCount,
      wpm,
      pauseCount,
      longSilenceDurationMs,
    };
  }
}
