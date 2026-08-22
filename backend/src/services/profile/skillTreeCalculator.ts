/**
 * 7-Level Pedagogical Skill Tree Engine (v15.0.0)
 *
 * Source of Truth: 06_SKILL_TREE_SPEC.md & Blueprint V15.0
 * Pure deterministic logic — zero LLM calls.
 * Calculates L1-L7 mastery progression using recent (latest 5) + historical (70/30) scores,
 * applies sequential 90.00% unlock threshold, and enforces L3 Socratic metadata constraint.
 */

import {
  calculateL1Progress,
  calculateL2Progress,
  calculateL3Progress,
  calculateL4Progress,
  calculateL5Progress,
  calculateL6Progress,
  calculateL7Progress,
} from './skillLevelScorers';
import { extractTurnData, extractCoachSnapshot, RadarData } from './radarCalculator';
import { extractCleanFallacies } from './fallacyAggregator';

export interface SkillLevelNode {
  level: number;
  id: string;
  title: string;
  titleEn: string;
  description: string;
  unlocked: boolean;
  isLocked: boolean;
  skillProgress: number; // Single session / baseline progress (0-100)
  masteryProgress: number; // 70% recent (5) + 30% historical (0-100)
  unlockThreshold: number; // 90.0
  isCurrentLevel: boolean;
  socraticOnly: boolean;
  pedagogyFocus: string[];
  badge: string;
  remediationRecommendations: string[];
}

export interface SkillTreeProgressResult {
  levels: SkillLevelNode[];
  currentLevel: number;
  totalMasteryScore: number;
  unlockedCount: number;
}

export interface SessionRecord {
  id: string;
  topic: string;
  scoreTotal?: any;
  createdAt: Date | string;
  transcripts?: Array<{
    speakerType: string;
    fallaciesDetected?: unknown;
    evidenceStar?: number | null;
    textContent?: string;
  }>;
}

const CANONICAL_LEVEL_METADATA = [
  {
    level: 1,
    id: 'L1',
    title: 'Xây Dựng Lập Luận (C-R-E)',
    titleEn: 'C-R-E Foundation',
    description: 'Nắm vững cấu trúc lập luận chuẩn mực: Luận điểm (Claim), Lập luận (Reasoning), và Dẫn chứng (Evidence).',
    socraticOnly: false,
    pedagogyFocus: ['Định vị lập trường rõ ràng', 'Liên kết logic C-R-E', 'Dẫn chứng có nguồn gốc kiểm chứng'],
    badge: 'CRE_MASTER_BRONZE',
    remediationRecommendations: [
      'Đảm bảo mỗi lượt nói nêu rõ Luận điểm chính trước khi giải thích chi tiết.',
      'Sử dụng ít nhất 1 dẫn chứng thực tế hoặc số liệu thống kê để củng cố tiền đề.',
    ],
  },
  {
    level: 2,
    id: 'L2',
    title: 'Tiền Đề & Logic Nhân Quả',
    titleEn: 'Premises & Causal Logic',
    description: 'Xây dựng chuỗi liên kết nhân quả chặt chẽ, chứng minh cơ chế tại sao tiền đề dẫn đến kết luận tất yếu.',
    socraticOnly: false,
    pedagogyFocus: ['Phân tích cơ chế nhân quả (Mechanisms)', 'Làm rõ giả định ngầm (Implicit Assumptions)', 'Tránh nhảy vọt logic'],
    badge: 'LOGIC_ARCHITECT_SILVER',
    remediationRecommendations: [
      'Giải thích từng bước trung gian: A dẫn đến B như thế nào trước khi kết luận B tạo ra C.',
      'Đặt câu hỏi: "Tại sao điều này lại đúng trong mọi trường hợp?" để tự kiểm tra lập luận.',
    ],
  },
  {
    level: 3,
    id: 'L3',
    title: 'Phát Hiện & Hóa Giải Ngụy Biện',
    titleEn: 'Fallacy Challenge (Socratic)',
    description: 'Nhận diện các bẫy ngụy biện phổ biến và bẻ gãy chúng thông qua phương pháp vấn đáp Socratic.',
    socraticOnly: true,
    pedagogyFocus: ['Nhận diện 12 lỗi ngụy biện phổ biến', 'Phản biện dựa trên bẻ gãy tiền đề', 'Tự kiểm soát lỗi lập luận'],
    badge: 'FALLACY_BREAKER_GOLD',
    remediationRecommendations: [
      'Chế độ Vấn đáp Socratic: Trả lời các câu hỏi gợi mở của AI để tự phát hiện điểm hổng trong luận cứ.',
      'Tránh công kích cá nhân (Ad Hominem) hoặc khái quát hóa vội vã (Hasty Generalization).',
    ],
  },
  {
    level: 4,
    id: 'L4',
    title: 'Phản Biện Đa Chiều & So Sánh Tác Động',
    titleEn: 'Multi-dimensional Rebuttal & Impact',
    description: 'So sánh tác động sâu rộng (Quy mô, Cường độ, Tính cấp thiết) và phản biện đa góc nhìn.',
    socraticOnly: false,
    pedagogyFocus: ['Ma trận so sánh tác động (Impact Matrix)', 'Phản biện phòng ngừa (Pre-emptive rebuttal)', 'Đánh giá các bên liên quan (Stakeholders)'],
    badge: 'IMPACT_STRATEGIST_PLATINUM',
    remediationRecommendations: [
      'Đặt tác động của hai phe lên bàn cân so sánh dựa trên tính phục hồi và mức độ ảnh hưởng.',
      'Phản biện trực tiếp luận điểm mạnh nhất của đối thủ thay vì tấn công các điểm phụ.',
    ],
  },
  {
    level: 5,
    id: 'L5',
    title: 'Ứng Khẩu & Kiểm Soát POI 15 Giây',
    titleEn: 'POI 15s Floor & Impromptu',
    description: 'Kiểm soát chất vấn POI ngắn gọn, súc tích trong 15 giây và trả lời phản xạ tức thì dưới áp lực thời gian.',
    socraticOnly: false,
    pedagogyFocus: ['Chất vấn POI sắc bén dưới 15s', 'Xử lý POI không làm gãy mạch bài nói', 'Quản lý nhịp điệu giọng nói khi bị ngắt'],
    badge: 'POI_COMMANDER_RUBY',
    remediationRecommendations: [
      'Giới hạn câu chất vấn trong 1 câu hỏi trọng tâm duy nhất (dưới 15 giây).',
      'Trả lời dứt khoát trong 2 câu rồi nhanh chóng quay trở lại mạch luận điểm của mình.',
    ],
  },
  {
    level: 6,
    id: 'L6',
    title: 'Khung Thể Thức Quốc Tế WSDC / AP / BP',
    titleEn: 'Parliamentary Standards',
    description: 'Thi đấu thuần thục theo các luật chuẩn quốc tế: World Schools, Asian Parliamentary, British Parliamentary.',
    socraticOnly: false,
    pedagogyFocus: ['Phân công vai trò người nói (Speaker Roles)', 'Quy chuẩn thời gian an toàn (Protected Time)', 'Chiến lược phân bổ điểm số của giám khảo'],
    badge: 'PARLIAMENT_DIPLOMAT_DIAMOND',
    remediationRecommendations: [
      'Tuân thủ nghiêm ngặt vai trò người nói theo thứ tự bài phát biểu quốc tế.',
      'Đảm bảo bài nói tổng kết (Reply Speech) tập trung vào các điểm mấu chốt (Clashes).',
    ],
  },
  {
    level: 7,
    id: 'L7',
    title: 'Đổi Phe Thực Chiến & Tổng Kết Bàn Đấu',
    titleEn: 'Switch-side & Meta-strategy',
    description: 'Khả năng tranh biện thượng thừa ở cả hai phe Ủng hộ và Phản đối, làm chủ cục diện toàn bàn đấu.',
    socraticOnly: false,
    pedagogyFocus: ['Tranh biện đổi phe (Switch-side mastery)', 'Tổng kết điểm giao tranh (Clash Analysis)', 'Thiết lập tiêu chuẩn thắng cuộc (Burden of Proof)'],
    badge: 'GRANDMASTER_CHAMPION',
    remediationRecommendations: [
      'Luyện tập bảo vệ cùng một chủ đề ở cả hai chiến tuyến Affirmative và Negative.',
      'Tổng kết toàn diện bàn đấu và chứng minh phe mình đã hoàn thành đầy đủ nghĩa vụ chứng minh.',
    ],
  },
];

/**
 * Computes individual session scores for all 7 levels.
 */
function scoreSessionForLevels(session: SessionRecord, radar: RadarData): number[] {
  const uTranscripts = (session.transcripts || []).filter(t => t.speakerType === 'user');
  const turns = uTranscripts.map(extractTurnData);
  const totalTurns = turns.length;
  const scoreVal = Number(session.scoreTotal);
  const sessionScore = !isNaN(scoreVal) && scoreVal > 0 ? Math.min(100, scoreVal <= 10 ? scoreVal * 10 : scoreVal) : 75.0;

  if (totalTurns === 0) {
    return [50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0];
  }

  // Level 1: C-R-E
  const claimPres = (turns.filter(t => t.claimPresent).length / totalTurns) * 100;
  const reasonPres = (turns.filter(t => t.reasoningPresent).length / totalTurns) * 100;
  const avgStars = turns.reduce((acc, curr) => acc + curr.evidenceStar, 0) / totalTurns;
  const l1 = calculateL1Progress(claimPres, reasonPres, avgStars * 20);

  // Level 2: Causal Logic
  const l2 = calculateL2Progress(reasonPres, sessionScore);

  // Level 3: Fallacy Challenge
  let sessionFallacyCount = 0;
  for (const ut of uTranscripts) {
    sessionFallacyCount += extractCleanFallacies(ut.fallaciesDetected).length;
  }
  const coachScores = turns.map(t => t.coachScore).filter((s): s is number => s !== null && s > 0);
  const avgCoach = coachScores.length > 0 ? (coachScores.reduce((a, b) => a + b, 0) / coachScores.length) * 10 : sessionScore;
  const l3 = calculateL3Progress(sessionFallacyCount, avgCoach);

  // Level 4: Rebuttal
  const rebuttalDepth = (turns.filter(t => t.isRebuttal).length / totalTurns) * 100;
  const l4 = calculateL4Progress(rebuttalDepth, sessionScore);

  // Level 5: POI
  const l5 = calculateL5Progress(sessionScore, radar.reflex);

  // Level 6: Parliamentary Formats
  const l6 = calculateL6Progress(radar.structure, sessionScore, sessionScore);

  // Level 7: Meta-strategy
  const l7 = calculateL7Progress(radar.logic, radar.structure, radar.reflex, radar.voice);

  return [l1, l2, l3, l4, l5, l6, l7];
}

/**
 * Computes the 7-Level Skill Tree with deterministic unlock gates.
 */
export function computeSkillTree(
  sessions: SessionRecord[],
  radar: RadarData
): SkillTreeProgressResult {
  // Sort sessions by date descending (latest first)
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const validSessions = sortedSessions.filter(s => (s.transcripts || []).some(t => t.speakerType === 'user') || Number(s.scoreTotal) > 0);

  const k = validSessions.length;
  const levelScoresBySession: number[][] = validSessions.map(s => scoreSessionForLevels(s, radar));

  const UNLOCK_THRESHOLD = 90.00;
  const levels: SkillLevelNode[] = [];
  let isPreviousUnlocked = true;
  let highestUnlockedLevel = 1;

  for (let idx = 0; idx < CANONICAL_LEVEL_METADATA.length; idx++) {
    const meta = CANONICAL_LEVEL_METADATA[idx];
    const levelNum = meta.level;

    let recentScore = 50.0;
    let historicalScore = 50.0;
    let masteryProgress = 50.0;

    if (k > 0) {
      const allLevelScores = levelScoresBySession.map(sessionScores => sessionScores[idx]);
      const recentLevelScores = allLevelScores.slice(0, Math.min(k, 5));

      recentScore = recentLevelScores.reduce((a, b) => a + b, 0) / recentLevelScores.length;
      historicalScore = allLevelScores.reduce((a, b) => a + b, 0) / allLevelScores.length;

      masteryProgress = +(0.70 * recentScore + 0.30 * historicalScore).toFixed(1);
    }

    // Unlock Gate (Section 2-C.3):
    // Level 1 unlocked by default
    // Level N+1 unlocks iff Level N is unlocked AND Level N masteryProgress >= 90.00
    let unlocked = false;
    if (levelNum === 1) {
      unlocked = true;
    } else {
      unlocked = isPreviousUnlocked;
    }

    if (unlocked) {
      highestUnlockedLevel = levelNum;
    }

    // Check if THIS level unlocks the NEXT level
    isPreviousUnlocked = unlocked && masteryProgress >= UNLOCK_THRESHOLD;

    levels.push({
      level: levelNum,
      id: meta.id,
      title: meta.title,
      titleEn: meta.titleEn,
      description: meta.description,
      unlocked,
      isLocked: !unlocked,
      skillProgress: masteryProgress,
      masteryProgress,
      unlockThreshold: UNLOCK_THRESHOLD,
      isCurrentLevel: false, // Will be set after loop
      socraticOnly: meta.socraticOnly,
      pedagogyFocus: meta.pedagogyFocus,
      badge: meta.badge,
      remediationRecommendations: meta.remediationRecommendations,
    });
  }

  // Mark the highest unlocked level as current active level
  for (const lvl of levels) {
    if (lvl.level === highestUnlockedLevel) {
      lvl.isCurrentLevel = true;
    }
  }

  const totalMasteryScore = +(levels.reduce((acc, curr) => acc + curr.masteryProgress, 0) / levels.length).toFixed(1);
  const unlockedCount = levels.filter(l => l.unlocked).length;

  return {
    levels,
    currentLevel: highestUnlockedLevel,
    totalMasteryScore,
    unlockedCount,
  };
}
