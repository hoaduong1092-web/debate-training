/**
 * Fallacy Pedagogy Dictionary (v15.0.0)
 *
 * Source of Truth: 07_SCORING_SPEC.md & Blueprint V15.0
 * Pure deterministic mapping — zero LLM calls.
 * Used by Fallacy Diagnostic & Warning Engine to map detected fallacy codes
 * to pedagogical remediation tips and localized Vietnamese names.
 */

export interface FallacyPedagogyEntry {
  vietnameseName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  remediationTip: string;
}

export const FALLACY_PEDAGOGY_DICTIONARY: Record<string, FallacyPedagogyEntry> = {
  Strawman: {
    vietnameseName: 'Ngụy biện Người rơm',
    severity: 'HIGH',
    description: 'Bóp méo hoặc cường điệu hóa luận điểm của đối phương để dễ dàng công kích.',
    remediationTip: 'Tập trung trích dẫn chính xác và phản biện luận điểm cốt lõi của đối phương thay vì diễn giải quá đà hoặc bóp méo câu từ.',
  },
  'Ad Hominem': {
    vietnameseName: 'Ngụy biện Công kích cá nhân',
    severity: 'HIGH',
    description: 'Tấn công vào đặc điểm cá nhân, xuất thân hoặc động cơ của đối thủ thay vì phản biện lập luận.',
    remediationTip: 'Tách biệt người nói và lập luận. Hãy chất vấn logic của tiền đề và bằng chứng thay vì đặc tính cá nhân đối thủ.',
  },
  'Slippery Slope': {
    vietnameseName: 'Ngụy biện Dốc đứng trơn trượt',
    severity: 'MEDIUM',
    description: 'Tự ý suy diễn một chuỗi hậu quả tiêu cực cực đoan mà không chứng minh từng mắt xích nhân quả.',
    remediationTip: 'Chứng minh từng mắt xích nhân quả riêng biệt với dẫn chứng cụ thể thay vì giả định rằng bước đầu tiên chắc chắn dẫn đến thảm họa.',
  },
  'False Dilemma': {
    vietnameseName: 'Ngụy biện Nhị nguyên sai lầm',
    severity: 'MEDIUM',
    description: 'Ép tình huống vào hai thái cực độc tôn trong khi thực tế còn có nhiều giải pháp trung gian.',
    remediationTip: 'Tìm kiếm các phương án dung hòa hoặc giải pháp thứ ba thay vì ép vấn đề vào hai thái cực đối lập tuyệt đối.',
  },
  'Appeal to Emotion': {
    vietnameseName: 'Ngụy biện Lợi dụng cảm xúc',
    severity: 'MEDIUM',
    description: 'Dùng cảm xúc (thương hại, sợ hãi, phẫn nộ) để thuyết phục thay cho logic và dẫn chứng.',
    remediationTip: 'Bổ sung số liệu thực tế, nghiên cứu học thuật hoặc tiền lệ kiểm chứng được thay vì chỉ dựa vào sự đồng cảm cảm tính.',
  },
  'Circular Reasoning': {
    vietnameseName: 'Ngụy biện Lập luận vòng vo',
    severity: 'HIGH',
    description: 'Dùng lại chính kết luận dưới dạng diễn đạt khác để làm tiền đề chứng minh.',
    remediationTip: 'Sử dụng tiền đề độc lập bên ngoài để chứng minh kết luận thay vì lặp lại khẳng định ban đầu.',
  },
  'Red Herring': {
    vietnameseName: 'Ngụy biện Đánh lạc hướng (Cá trích đỏ)',
    severity: 'MEDIUM',
    description: 'Đưa ra chủ đề phụ không liên quan để chuyển hướng sự chú ý khỏi vấn đề cốt lõi.',
    remediationTip: 'Giữ vững trọng tâm của motion; kiểm tra xem mỗi luận điểm có trực tiếp chứng minh hoặc bác bỏ định đề hay không.',
  },
  'Non Sequitur': {
    vietnameseName: 'Ngụy biện Phi nhân quả',
    severity: 'HIGH',
    description: 'Kết luận đưa ra không hề bắt nguồn một cách hợp lý từ tiền đề đã nêu.',
    remediationTip: 'Làm rõ mối liên hệ trực tiếp giữa nguyên nhân và kết quả; kiểm tra xem kết luận có thực sự rút ra từ tiền đề không.',
  },
  'Hasty Generalization': {
    vietnameseName: 'Ngụy biện Khái quát hóa vội vã',
    severity: 'MEDIUM',
    description: 'Rút ra kết luận phổ quát từ số lượng mẫu quá nhỏ hoặc trường hợp cá biệt.',
    remediationTip: 'Tăng số lượng và độ đại diện của tập dữ liệu mẫu trước khi đưa ra kết luận mang tính quy luật.',
  },
  'Appeal to Authority': {
    vietnameseName: 'Ngụy biện Dựa vào uy tín giả mạo',
    severity: 'LOW',
    description: 'Trích dẫn nhân vật nổi tiếng nhưng không có chuyên môn trực tiếp trong lĩnh vực đang tranh biện.',
    remediationTip: 'Đảm bảo chuyên gia được trích dẫn có chuyên môn trực tiếp trong lĩnh vực và cung cấp cơ sở khoa học của họ.',
  },
  'Post Hoc': {
    vietnameseName: 'Ngụy biện Tương quan thời gian',
    severity: 'MEDIUM',
    description: 'Cho rằng sự việc xảy ra sau nhất định do sự việc xảy ra trước là nguyên nhân.',
    remediationTip: 'Phân biệt giữa tương quan thời gian và quan hệ nhân quả thực sự bằng cơ chế tác động rõ ràng.',
  },
  'Post Hoc Ergo Propter Hoc': {
    vietnameseName: 'Ngụy biện Tương quan thời gian',
    severity: 'MEDIUM',
    description: 'Cho rằng sự việc xảy ra sau nhất định do sự việc xảy ra trước là nguyên nhân.',
    remediationTip: 'Phân biệt giữa tương quan thời gian và quan hệ nhân quả thực sự bằng cơ chế tác động rõ ràng.',
  },
  Bandwagon: {
    vietnameseName: 'Ngụy biện Đám đông',
    severity: 'LOW',
    description: 'Lấy số đông người tin tưởng hoặc thực hiện để chứng minh cho tính đúng đắn của luận điểm.',
    remediationTip: 'Số đông ủng hộ không đồng nghĩa với tính đúng đắn logic; hãy đánh giá dựa trên bản chất lập luận.',
  },
  'Appeal to Popularity': {
    vietnameseName: 'Ngụy biện Đám đông',
    severity: 'LOW',
    description: 'Lấy số đông người tin tưởng hoặc thực hiện để chứng minh cho tính đúng đắn của luận điểm.',
    remediationTip: 'Số đông ủng hộ không đồng nghĩa với tính đúng đắn logic; hãy đánh giá dựa trên bản chất lập luận.',
  },
};

/**
 * Fallback helper to resolve pedagogy entry for any fallacy token (case-insensitive & alias-friendly).
 */
export function getFallacyPedagogy(fallacyName: string): FallacyPedagogyEntry {
  const clean = fallacyName.trim();
  if (FALLACY_PEDAGOGY_DICTIONARY[clean]) {
    return FALLACY_PEDAGOGY_DICTIONARY[clean];
  }

  // Case-insensitive lookup
  const lower = clean.toLowerCase();
  for (const [key, val] of Object.entries(FALLACY_PEDAGOGY_DICTIONARY)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }

  return {
    vietnameseName: `Lỗi ngụy biện: ${clean}`,
    severity: 'MEDIUM',
    description: 'Lập luận chứa tiền đề chưa hợp lý hoặc vi phạm quy tắc suy luận logic.',
    remediationTip: 'Kiểm tra lại cấu trúc nhân quả và bổ sung tiền đề chứng minh độc lập cho luận điểm.',
  };
}
