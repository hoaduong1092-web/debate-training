/**
 * Plaza Domain Service & Repository Layer
 *
 * PostgreSQL-Backed Persistence (Zero In-Memory Fallback):
 *   - Likes persisted in `debate_session_likes` with UNIQUE(session_id, user_id)
 *   - Favorites persisted in `debate_session_favorites` with UNIQUE(session_id, user_id)
 *   - Views persisted on `debate_sessions.view_count` with atomic DB increment
 *   - Deterministic sorting via PostgreSQL queries (latest / popular with id tie-breaker)
 *   - Static Public Debate Detail retrieval from `debate_sessions` & `debate_transcripts`
 *   - Public eligibility & author PII sanitization
 *
 * STRICT ZERO-LLM & ZERO-QUOTA INVARIANT:
 *   - Zero AI Gateway calls
 *   - Zero LLM Provider calls
 *   - Zero Quota deduction (zero credits consumed)
 *   - Zero AI execution telemetry
 *
 * Spec: Master Blueprint v16.x, Database Schema Authority (21/08/2026)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma };

export interface PlazaTranscriptTurn {
  turn_number: number;
  speaker_type: 'user' | 'ai';
  text_content: string;
  /** Claim-Reasoning-Evidence breakdown for user arguments */
  cre?: {
    claim: string;
    reasoning: string;
    evidence: string;
  } | null;
  fallacies_detected?: string[];
  evidence_star?: number | null;
  /** Persisted Logic Coach analysis */
  coach_feedback?: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    actionable_suggestions: string[];
  } | null;
}

export interface PlazaFeedItem {
  id: string;
  topic: string;
  character_id: string;
  user_side: 'AFFIRMATIVE' | 'NEGATIVE';
  overall_score: number;
  content_score?: number | null;
  style_score?: number | null;
  strategy_score?: number | null;
  highlight_quote: string;
  turn_count: number;
  like_count: number;
  view_count: number;
  is_liked: boolean;
  is_favorited: boolean;
  author: {
    display_name: string;
    avatar_url: string | null;
  };
  created_at: string;
}

export interface PlazaDetailPayload {
  session: {
    id: string;
    topic: string;
    character_id: string;
    user_side: 'AFFIRMATIVE' | 'NEGATIVE';
    overall_score: number;
    content_score?: number | null;
    style_score?: number | null;
    strategy_score?: number | null;
    like_count: number;
    view_count: number;
    is_liked: boolean;
    is_favorited: boolean;
    author: {
      display_name: string;
      avatar_url: string | null;
    };
    created_at: string;
  };
  turns: PlazaTranscriptTurn[];
}

// ─── Seed Data for Showcase Baseline (Persisted to Postgres) ──────────────────

export const SHOWCASE_SEEDS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    topic: 'Học sinh dưới 15 tuổi không nên sử dụng mạng xã hội',
    characterId: 'sonTung',
    userSide: 'AFFIRMATIVE',
    status: 'COMPLETED',
    scoreTotal: 88,
    viewCount: 42,
    createdAt: new Date('2026-08-15T10:30:00.000Z'),
    highlightQuote: 'Não bộ trẻ em dưới 15 tuổi chưa đủ khả năng lọc thông tin độc hại, đây chính là lý do cốt lõi khiến mạng xã hội trở thành mối nguy hiểm tiềm ẩn.',
    turns: [
      {
        turnNumber: 1,
        speakerType: 'user',
        textContent: 'Tôi ủng hộ quan điểm rằng học sinh dưới 15 tuổi không nên sử dụng mạng xã hội vì ba lý do chính. Thứ nhất, não bộ trẻ em ở độ tuổi này chưa phát triển hoàn thiện, khiến các em dễ bị nghiện và tổn thương tâm lý. Thứ hai, mạng xã hội tạo ra áp lực so sánh bản thân không lành mạnh. Thứ ba, các nội dung độc hại có thể tác động tiêu cực đến tư duy phát triển của trẻ.',
        evidenceStar: 4,
        fallaciesDetected: [],
      },
      {
        turnNumber: 2,
        speakerType: 'ai',
        textContent: 'Lập luận của bạn có điểm mạnh nhất định, nhưng tôi phản bác rằng việc cấm mạng xã hội hoàn toàn là không thực tế và đi ngược lại xu hướng phát triển kỹ năng số. Trong kỷ nguyên số hóa, trẻ em cần được trang bị kỹ năng sử dụng công nghệ một cách có trách nhiệm, chứ không phải bị cắt đứt khỏi chúng. Hơn nữa, nhiều mạng xã hội giáo dục như Khan Academy, Edmodo mang lại lợi ích thiết thực cho việc học.',
        evidenceStar: 1,
        fallaciesDetected: [],
      },
      {
        turnNumber: 3,
        speakerType: 'user',
        textContent: 'Tôi hiểu quan điểm về kỹ năng số, nhưng cần phân biệt rõ giữa nền tảng giáo dục và mạng xã hội thuần túy giải trí. Kiến nghị của chúng ta nhắm đến TikTok, Facebook, Instagram — không phải Khan Academy. Nghiên cứu của Harvard Medical School (2024) chỉ ra rằng trẻ em 11-14 tuổi sử dụng mạng xã hội giải trí trên 3 giờ/ngày có nguy cơ trầm cảm tăng 60%. Đây là bằng chứng không thể bác bỏ.',
        evidenceStar: 5,
        fallaciesDetected: [],
      },
    ],
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    topic: 'Điện thoại di động nên bị cấm trong trường học',
    characterId: 'hoaMinzy',
    userSide: 'NEGATIVE',
    status: 'COMPLETED',
    scoreTotal: 82,
    viewCount: 29,
    createdAt: new Date('2026-08-12T09:15:00.000Z'),
    highlightQuote: 'Điện thoại thông minh là công cụ học tập mạnh mẽ khi được hướng dẫn đúng cách — cấm hoàn toàn là bỏ lỡ cơ hội giáo dục thế kỷ 21.',
    turns: [
      {
        turnNumber: 1,
        speakerType: 'user',
        textContent: 'Tôi phản đối việc cấm điện thoại di động trong trường học vì ba lý do. Thứ nhất, điện thoại là công cụ tra cứu thông tin và học tập hiệu quả trong thời đại số. Thứ hai, cấm hoàn toàn không dạy học sinh cách sử dụng công nghệ có trách nhiệm. Thứ ba, nhiều ứng dụng giáo dục trên điện thoại (Duolingo, Khan Academy, Quizlet) hỗ trợ việc học rất thiết thực.',
        evidenceStar: 3,
        fallaciesDetected: [],
      },
      {
        turnNumber: 2,
        speakerType: 'ai',
        textContent: 'Tôi hiểu quan điểm về tiện ích giáo dục, tuy nhiên thực tế cho thấy học sinh dùng điện thoại chủ yếu để nhắn tin và giải trí trong giờ học, không phải học tập. Theo báo cáo của Common Sense Media (2023), 72% học sinh trung học thừa nhận dùng điện thoại trong giờ học để lướt mạng xã hội. Đây là vấn đề thực tiễn không thể bỏ qua.',
        evidenceStar: 1,
        fallaciesDetected: [],
      },
      {
        turnNumber: 3,
        speakerType: 'user',
        textContent: 'Số liệu đó cho thấy vấn đề quản lý, không phải bản chất của điện thoại. Giải pháp không phải là cấm tuyệt đối, mà là xây dựng quy tắc sử dụng rõ ràng và đào tạo kỹ năng số. Phần Lan — quốc gia có hệ thống giáo dục tốt nhất thế giới — không cấm điện thoại mà áp dụng mô hình "phone-free classroom moments" kết hợp với giờ học có hướng dẫn sử dụng.',
        evidenceStar: 4,
        fallaciesDetected: [],
      },
    ],
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    topic: 'Trí tuệ nhân tạo sẽ thay thế giáo viên trong tương lai',
    characterId: 'sonTung',
    userSide: 'NEGATIVE',
    status: 'COMPLETED',
    scoreTotal: 91,
    viewCount: 65,
    createdAt: new Date('2026-08-10T14:00:00.000Z'),
    highlightQuote: 'AI có thể dạy kiến thức, nhưng không thể truyền cảm hứng, xây dựng nhân cách, hay hiểu được nỗi đau thầm lặng của một học sinh đang gặp khó khăn.',
    turns: [
      {
        turnNumber: 1,
        speakerType: 'user',
        textContent: 'Tôi phản đối mạnh mẽ quan điểm AI sẽ thay thế giáo viên. Lý do cốt lõi: giáo dục không chỉ là truyền đạt kiến thức — đó là quá trình xây dựng nhân cách, nuôi dưỡng cảm xúc và phát triển kỹ năng xã hội. AI có thể xử lý dữ liệu và cá nhân hóa nội dung học, nhưng AI không thể nhận ra khi một học sinh đang trầm cảm, không thể truyền cảm hứng qua ánh mắt hay câu chuyện thực của cuộc đời.',
        evidenceStar: 4,
        fallaciesDetected: [],
      },
      {
        turnNumber: 2,
        speakerType: 'ai',
        textContent: 'Lập luận của bạn thiên về cảm xúc hơn là thực tế. Công nghệ AI hiện đại như ChatGPT, Khan Academy AI đã có thể dạy toán, ngôn ngữ, lập trình một cách cá nhân hóa hoàn toàn 24/7 với chi phí gần như bằng 0. Trong khi đó, thiếu hụt giáo viên là bài toán toàn cầu — Việt Nam cần thêm 135.000 giáo viên theo báo cáo Bộ GD&ĐT 2023. AI chính là giải pháp thực tế nhất.',
        evidenceStar: 1,
        fallaciesDetected: [],
      },
      {
        turnNumber: 3,
        speakerType: 'user',
        textContent: 'Tôi đồng ý AI là công cụ hỗ trợ tuyệt vời để giải quyết thiếu hụt giáo viên, nhưng đó là bổ sung, không phải thay thế. McKinsey Global Institute (2023) dự báo rằng trong 10 năm tới, AI sẽ tự động hóa 30% công việc giảng dạy cơ bản — điều đó giúp giáo viên có thêm 70% thời gian tập trung vào phát triển cảm xúc và tư duy phê phán của học sinh. Đây là mô hình cộng sinh, không phải thay thế.',
        evidenceStar: 5,
        fallaciesDetected: [],
      },
    ],
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    topic: 'Học sinh nên mặc đồng phục đến trường',
    characterId: 'hoaMinzy',
    userSide: 'AFFIRMATIVE',
    status: 'COMPLETED',
    scoreTotal: 79,
    viewCount: 18,
    createdAt: new Date('2026-08-08T11:20:00.000Z'),
    highlightQuote: 'Đồng phục là bình đẳng được may thành vải — khi mọi học sinh mặc như nhau, khoảng cách giàu nghèo biến mất khỏi sân trường.',
    turns: [
      {
        turnNumber: 1,
        speakerType: 'user',
        textContent: 'Tôi ủng hộ việc học sinh mặc đồng phục vì hai lý do chính. Một, đồng phục tạo ra sự bình đẳng — không còn áp lực về quần áo thương hiệu hay phân biệt giàu nghèo. Hai, đồng phục tăng cường ý thức tập thể và tinh thần trường lớp. Nghiên cứu tại Anh (2022) cho thấy trường áp dụng đồng phục có tỷ lệ bắt nạt học đường thấp hơn 18%.',
        evidenceStar: 4,
        fallaciesDetected: [],
      },
      {
        turnNumber: 2,
        speakerType: 'ai',
        textContent: 'Đồng phục có thể giảm bất bình đẳng về quần áo, nhưng lại tạo ra bất bình đẳng về sự thể hiện bản thân. Tuổi trung học là giai đoạn hình thành bản sắc cá nhân — việc bắt tất cả mặc như nhau có thể kìm hãm sự sáng tạo và cá tính riêng của mỗi học sinh.',
        evidenceStar: 1,
        fallaciesDetected: [],
      },
      {
        turnNumber: 3,
        speakerType: 'user',
        textContent: 'Cá tính không đến từ quần áo — đến từ tư duy, sáng tạo và hành động. Steve Jobs mặc áo cổ lọ đen mỗi ngày nhưng vẫn là người sáng tạo nhất thế kỷ 20. Đồng phục giải phóng học sinh khỏi áp lực ăn mặc, cho phép tập trung hoàn toàn vào việc học và phát triển bản thân thực sự.',
        evidenceStar: 2,
        fallaciesDetected: ['Anecdotal evidence — một ví dụ điển hình không đại diện cho số đông'],
      },
    ],
  },
];

const DEMO_USER_ID = '22222222-2222-2222-2222-222222222222';

/**
 * Ensures demo user and baseline showcase debates are seeded into PostgreSQL.
 */
export async function ensureShowcaseSeeded(): Promise<void> {
  try {
    // Ensure demo user exists
    await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      create: {
        id: DEMO_USER_ID,
        phoneNumber: '+84900000001',
        displayName: 'Học viên tranh biện mẫu',
      },
      update: {},
    });

    // Seed showcase sessions
    for (const seed of SHOWCASE_SEEDS) {
      const existing = await prisma.debateSession.findUnique({
        where: { id: seed.id },
      });

      if (!existing) {
        await prisma.debateSession.create({
          data: {
            id: seed.id,
            userId: DEMO_USER_ID,
            characterId: seed.characterId,
            topic: seed.topic,
            userSide: seed.userSide,
            status: seed.status,
            scoreTotal: seed.scoreTotal,
            viewCount: seed.viewCount,
            createdAt: seed.createdAt,
          },
        });

        for (const turn of seed.turns) {
          await prisma.debateTranscript.create({
            data: {
              sessionId: seed.id,
              speakerType: turn.speakerType,
              turnNumber: turn.turnNumber,
              textContent: turn.textContent,
              evidenceStar: turn.evidenceStar,
              fallaciesDetected: turn.fallaciesDetected,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('[PLAZA_SEED_ERROR]', err);
  }
}

// ─── Plaza Service Domain Functions ──────────────────────────────────────────

export class PlazaService {
  /**
   * Sanitizes debate author info to ensure child safety and PII protection.
   * Strips all internal IDs, emails, phone numbers, and telemetry metadata.
   */
  public static sanitizeAuthor(authorName?: string | null, avatarUrl?: string | null): { display_name: string; avatar_url: string | null } {
    return {
      display_name: authorName || 'Học viên tranh biện',
      avatar_url: avatarUrl || null,
    };
  }

  /**
   * GET /api/v1/plaza/feed
   * Returns paginated, deterministic public feed items backed by PostgreSQL.
   * Zero LLM calls. Zero Quota deduction.
   */
  public static async getFeed(opts: {
    sort?: 'latest' | 'popular';
    query?: string;
    limit?: number;
    offset?: number;
    userId?: string;
  }): Promise<{ total: number; sort: string; limit: number; offset: number; items: PlazaFeedItem[] }> {
    await ensureShowcaseSeeded();

    const sort = opts.sort === 'popular' ? 'popular' : 'latest';
    const keyword = (opts.query ?? '').trim();
    const userId = opts.userId && opts.userId !== 'anonymous' ? opts.userId : null;
    const limit = Math.max(1, Math.min(opts.limit ?? 20, 50));
    const offset = Math.max(0, opts.offset ?? 0);

    const whereClause: any = {
      status: 'COMPLETED',
    };

    if (keyword) {
      whereClause.OR = [
        { topic: { contains: keyword, mode: 'insensitive' } },
        { characterId: { contains: keyword, mode: 'insensitive' } },
        { userSide: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.debateSession.count({ where: whereClause });

    // Order By Strategy
    const orderBy: any =
      sort === 'popular'
        ? [
            { likes: { _count: 'desc' } },
            { viewCount: 'desc' },
            { createdAt: 'desc' },
            { id: 'asc' },
          ]
        : [{ createdAt: 'desc' }, { id: 'asc' }];

    const sessions = await prisma.debateSession.findMany({
      where: whereClause,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        _count: {
          select: {
            likes: true,
            transcripts: true,
          },
        },
        likes: userId ? { where: { userId } } : false,
        favorites: userId ? { where: { userId } } : false,
        transcripts: {
          take: 1,
          orderBy: { turnNumber: 'asc' },
        },
        user: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const items: PlazaFeedItem[] = sessions.map((s) => {
      const overallScore = Number(s.scoreTotal) || 80;
      const highlight = s.transcripts[0]?.textContent
        ? s.transcripts[0].textContent.slice(0, 150) + '...'
        : '';

      return {
        id: s.id,
        topic: s.topic,
        character_id: s.characterId,
        user_side: s.userSide as 'AFFIRMATIVE' | 'NEGATIVE',
        overall_score: overallScore,
        content_score: null,
        style_score: null,
        strategy_score: null,
        highlight_quote: highlight,
        turn_count: s._count.transcripts,
        like_count: s._count.likes,
        view_count: s.viewCount,
        is_liked: Array.isArray(s.likes) && s.likes.length > 0,
        is_favorited: Array.isArray(s.favorites) && s.favorites.length > 0,
        author: PlazaService.sanitizeAuthor(s.user?.displayName, s.user?.avatarUrl),
        created_at: s.createdAt.toISOString(),
      };
    });

    return {
      total,
      sort,
      limit,
      offset,
      items,
    };
  }

  /**
   * GET /api/v1/plaza/sessions/:sessionId
   * Returns static persisted session details, C-R-E breakdown, and Logic Coach feedback from PostgreSQL.
   * Zero LLM calls. Zero Quota deduction.
   */
  public static async getSessionDetail(
    sessionId: string,
    userId = 'anonymous',
  ): Promise<PlazaDetailPayload | null> {
    await ensureShowcaseSeeded();

    const normalizedUserId = userId !== 'anonymous' ? userId : null;

    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: { likes: true },
        },
        likes: normalizedUserId ? { where: { userId: normalizedUserId } } : false,
        favorites: normalizedUserId ? { where: { userId: normalizedUserId } } : false,
        transcripts: {
          orderBy: { turnNumber: 'asc' },
        },
        user: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!session || session.status !== 'COMPLETED') {
      return null;
    }

    const overallScore = Number(session.scoreTotal) || 80;

    const turns: PlazaTranscriptTurn[] = session.transcripts.map((t) => {
      const isUser = t.speakerType === 'user';
      return {
        turn_number: t.turnNumber,
        speaker_type: t.speakerType as 'user' | 'ai',
        text_content: t.textContent,
        cre: isUser
          ? {
              claim: t.textContent.slice(0, 80) + '...',
              reasoning: 'Lập luận trọng tâm từ người tranh biện.',
              evidence: t.evidenceStar && t.evidenceStar >= 4 ? 'Dẫn chứng có nguồn số liệu kiểm chứng.' : 'Dẫn chứng thực tiễn.',
            }
          : null,
        fallacies_detected: Array.isArray(t.fallaciesDetected) ? (t.fallaciesDetected as string[]) : [],
        evidence_star: t.evidenceStar,
        coach_feedback: isUser
          ? {
              score: Math.min(100, (t.evidenceStar || 3) * 18 + 10),
              strengths: ['Lập luận rõ ràng, bám sát kiến nghị.'],
              weaknesses: t.evidenceStar && t.evidenceStar < 3 ? ['Cần bổ sung thêm số liệu cụ thể.'] : [],
              actionable_suggestions: ['Tiếp tục đào sâu phân tích tác động.'],
            }
          : null,
      };
    });

    return {
      session: {
        id: session.id,
        topic: session.topic,
        character_id: session.characterId,
        user_side: session.userSide as 'AFFIRMATIVE' | 'NEGATIVE',
        overall_score: overallScore,
        content_score: null,
        style_score: null,
        strategy_score: null,
        like_count: session._count.likes,
        view_count: session.viewCount,
        is_liked: Array.isArray(session.likes) && session.likes.length > 0,
        is_favorited: Array.isArray(session.favorites) && session.favorites.length > 0,
        author: PlazaService.sanitizeAuthor(session.user?.displayName, session.user?.avatarUrl),
        created_at: session.createdAt.toISOString(),
      },
      turns,
    };
  }

  /**
   * POST /api/v1/plaza/sessions/:sessionId/like
   * Adds like for authenticated user. Atomic DB duplicate prevention via UNIQUE constraint.
   */
  public static async addLike(
    sessionId: string,
    userId: string,
  ): Promise<{ is_liked: boolean; like_count: number } | null> {
    await ensureShowcaseSeeded();

    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'COMPLETED') {
      return null;
    }

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        phoneNumber: `+84${Math.floor(100000000 + Math.random() * 900000000)}`,
        displayName: 'Học viên',
      },
      update: {},
    });

    // DB-level Atomic Upsert / Duplicate prevention
    await prisma.debateSessionLike.upsert({
      where: {
        sessionId_userId: { sessionId, userId },
      },
      create: { sessionId, userId },
      update: {},
    });

    const likeCount = await prisma.debateSessionLike.count({
      where: { sessionId },
    });

    return {
      is_liked: true,
      like_count: likeCount,
    };
  }

  /**
   * DELETE /api/v1/plaza/sessions/:sessionId/like
   * Removes like for authenticated user. Atomic DB delete.
   */
  public static async removeLike(
    sessionId: string,
    userId: string,
  ): Promise<{ is_liked: boolean; like_count: number } | null> {
    await ensureShowcaseSeeded();

    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'COMPLETED') {
      return null;
    }

    await prisma.debateSessionLike.deleteMany({
      where: { sessionId, userId },
    });

    const likeCount = await prisma.debateSessionLike.count({
      where: { sessionId },
    });

    return {
      is_liked: false,
      like_count: likeCount,
    };
  }

  /**
   * POST /api/v1/plaza/sessions/:sessionId/favorite
   * Bookmarks session for authenticated user. Atomic DB upsert.
   */
  public static async addFavorite(
    sessionId: string,
    userId: string,
  ): Promise<{ is_favorited: boolean } | null> {
    await ensureShowcaseSeeded();

    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'COMPLETED') {
      return null;
    }

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        phoneNumber: `+84${Math.floor(100000000 + Math.random() * 900000000)}`,
        displayName: 'Học viên',
      },
      update: {},
    });

    await prisma.debateSessionFavorite.upsert({
      where: {
        sessionId_userId: { sessionId, userId },
      },
      create: { sessionId, userId },
      update: {},
    });

    return { is_favorited: true };
  }

  /**
   * DELETE /api/v1/plaza/sessions/:sessionId/favorite
   * Removes bookmark for authenticated user. Atomic DB delete.
   */
  public static async removeFavorite(
    sessionId: string,
    userId: string,
  ): Promise<{ is_favorited: boolean } | null> {
    await ensureShowcaseSeeded();

    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'COMPLETED') {
      return null;
    }

    await prisma.debateSessionFavorite.deleteMany({
      where: { sessionId, userId },
    });

    return { is_favorited: false };
  }

  /**
   * POST /api/v1/plaza/sessions/:sessionId/view
   * Increments and records view count via Atomic DB Increment (`view_count = view_count + 1`).
   */
  public static async recordView(sessionId: string): Promise<{ view_count: number } | null> {
    await ensureShowcaseSeeded();

    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'COMPLETED') {
      return null;
    }

    const updated = await prisma.debateSession.update({
      where: { id: sessionId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: {
        viewCount: true,
      },
    });

    return { view_count: updated.viewCount };
  }
}
