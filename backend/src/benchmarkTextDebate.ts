import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { handleDebateMessage } from './controllers/debateController';

dotenv.config();

const prisma = new PrismaClient();

const USER_ID = '22222222-2222-2222-2222-222222222222';
const STANCE = 'AFFIRMATIVE';
const MAX_ATTEMPTS = 3;
const CALL_TIMEOUT_MS = 120000;
const COOLDOWN_MS = 1000;
const CHECKPOINT_PATH = join(__dirname, '..', '.benchmark-text-debate-state.json');

const TURN_CONTENTS: string[] = [
  'Mạng xã hội khiến học sinh dưới 15 tuổi mất tập trung nghiêm trọng trong giờ học.',
  'Các thông báo liên tục từ điện thoại phá vỡ dòng suy nghĩ và làm giảm khả năng ghi nhớ bài học.',
  'Thuật toán video ngắn kích thích dopamine khiến não bộ trẻ khó tập trung vào việc học.',
  'Học sinh dùng mạng xã hội nhiều giờ mỗi ngày sẽ bị thiếu ngủ vì thức khuya lướt tin.',
  'Thiếu ngủ dẫn đến suy giảm trí nhớ và kết quả học tập đi xuống rõ rệt.',
  'Mạng xã hội tạo ra áp lực so sánh bản thân với bạn bè, gây lo âu và tự ti.',
  'Nhiều nghiên cứu cho thấy thanh thiếu niên dùng mạng xã hội có tỷ lệ trầm cảm cao hơn.',
  'Bắt nạt trên mạng là hệ quả trực tiếp của việc trẻ em sử dụng mạng xã hội quá sớm.',
  'Trẻ dưới 15 tuổi chưa đủ kỹ năng để xử lý các bình luận tiêu cực và công kích cá nhân.',
  'Thông tin sai lệch lan truyền nhanh trên mạng xã hội làm lệch lạc nhận thức của học sinh.',
  'Trẻ em dễ tin vào các nội dung giật gân mà không kiểm chứng nguồn gốc.',
  'Việc tiếp xúc với nội dung không phù hợp độ tuổi có thể gây tổn thương tâm lý lâu dài.',
  'Não bộ dưới 15 tuổi chưa hoàn thiện vùng điều khiển hành vi nên dễ nghiện mạng xã hội.',
  'Các nhà tâm lý học khuyến cáo nên giới hạn thời gian dùng mạng xã hội cho trẻ vị thành niên.',
  'Thời gian dành cho mạng xã hội lấy mất thời gian chơi thể thao và vận động ngoài trời.',
  'Ít vận động khiến sức khỏe thể chất của học sinh suy giảm và tăng nguy cơ béo phì.',
  'Nhìn màn hình điện thoại quá lâu gây mỏi mắt và cận thị ở lứa tuổi học đường.',
  'Mạng xã hội làm giảm khả năng giao tiếp trực tiếp và kỹ năng xã hội của trẻ.',
  'Trẻ em dành quá nhiều thời gian online sẽ ít trò chuyện với gia đình và bạn bè thực sự.',
  'Mối quan hệ gia đình trở nên xa cách khi mỗi thành viên chỉ chăm chú vào màn hình.',
  'Dữ liệu cá nhân của trẻ em dễ bị thu thập và lạm dụng vì các em chưa hiểu về quyền riêng tư.',
  'Các nền tảng mạng xã hội nhắm quảng cáo trực tiếp vào trẻ em, thao túng hành vi tiêu dùng.',
  'Trẻ dưới 15 tuổi chưa đủ khả năng tự bảo vệ bản thân trước các mối nguy hiểm trực tuyến.',
  'Nhiều kẻ xấu lợi dụng mạng xã hội để tiếp cận và lừa đảo trẻ em.',
  'Việc cấm hoặc hạn chế mạng xã hội giúp bảo vệ sự phát triển lành mạnh của trẻ.',
  'Phụ huynh khó kiểm soát hoàn toàn nội dung mà con em tiếp cận trên mạng.',
  'Trường học đang đối mặt với tình trạng học sinh lén dùng điện thoại trong lớp.',
  'Điểm số của học sinh sụt giảm có mối liên hệ với thời gian sử dụng mạng xã hội.',
  'Các ứng dụng mạng xã hội được thiết kế để gây nghiện chứ không phải để giáo dục.',
  'Cơ chế cuộn vô tận khiến trẻ khó dừng lại và mất kiểm soát thời gian.',
  'Thay vì mạng xã hội, học sinh nên đọc sách và tham gia hoạt động ngoại khóa.',
  'Đọc sách giúp phát triển tư duy phản biện tốt hơn là lướt tin tức trên mạng.',
  'Các hoạt động ngoại khóa rèn luyện kỹ năng làm việc nhóm mà mạng xã hội không thể thay thế.',
  'Mạng xã hội khuyến khích văn hóa khoe khoang và chạy theo lượt thích, làm méo mó giá trị sống.',
  'Trẻ em học theo những hình mẫu không lành mạnh trên mạng và hình thành thói quen xấu.',
  'Áp lực phải đẹp hoàn hảo trên mạng xã hội gây rối loạn ăn uống ở thanh thiếu niên.',
  'Các chuyên gia giáo dục đồng tình rằng nên trì hoãn việc dùng mạng xã hội đến 16 tuổi.',
  'Một số quốc gia đã ban hành luật cấm trẻ dưới 16 tuổi dùng mạng xã hội mà không có sự đồng ý của phụ huynh.',
  'Bằng chứng thực nghiệm cho thấy việc ngừng dùng mạng xã hội giúp cải thiện tâm trạng của thanh thiếu niên.',
  'Vì tất cả những lý do trên, học sinh dưới 15 tuổi không nên sử dụng mạng xã hội để bảo vệ tương lai của chính mình.',
];

const TIER_DEFS = [
  { name: 'SHORT', turns: 2 },
  { name: 'TYPICAL', turns: 20 },
  // { name: 'STRESS', turns: 40 },
];

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface ControllerResponse {
  status: number;
  payload: any;
}

interface TurnResult {
  turn: number;
  success: boolean;
  inputTokens: number;
  outputTokens: number;
  executionMs: number;
  latencyMs: number;
  error?: string;
  quotaAborted?: boolean;
}

interface TierState {
  sessionId: string;
  status: 'RUNNING' | 'COMPLETED' | 'PAUSED';
  nextTurn: number;
  turnCount: number;
  completedTurns: number;
  failedTurns: number;
  inputTokensByTurn: number[];
  outputTokensByTurn: number[];
  executionMsByTurn: number[];
}

interface BenchmarkState {
  tiers: Record<string, TierState>;
  lastUpdated: string;
}

// ─── Checkpoint persistence ──────────────────────────────────────────────────

function loadCheckpoint(): BenchmarkState | null {
  if (process.env.BENCHMARK_RESET === '1') {
    console.log('[CHECKPOINT] BENCHMARK_RESET=1 — starting fresh.');
    if (existsSync(CHECKPOINT_PATH)) {
      writeFileSync(CHECKPOINT_PATH, '', 'utf-8');
    }
    return null;
  }
  if (!existsSync(CHECKPOINT_PATH)) {
    return null;
  }
  try {
    const raw = readFileSync(CHECKPOINT_PATH, 'utf-8');
    if (!raw.trim()) return null;
    const state: BenchmarkState = JSON.parse(raw);
    console.log(`[CHECKPOINT] Loaded from ${CHECKPOINT_PATH} (updated: ${state.lastUpdated})`);
    return state;
  } catch {
    console.log('[CHECKPOINT] Corrupted or empty — starting fresh.');
    return null;
  }
}

function saveCheckpoint(state: BenchmarkState): void {
  state.lastUpdated = new Date().toISOString();
  const tmpPath = CHECKPOINT_PATH + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  renameSync(tmpPath, CHECKPOINT_PATH);
}

function initFreshState(): BenchmarkState {
  const tiers: Record<string, TierState> = {};
  for (const def of TIER_DEFS) {
    tiers[def.name] = {
      sessionId: randomUUID(),
      status: 'RUNNING',
      nextTurn: 1,
      turnCount: def.turns,
      completedTurns: 0,
      failedTurns: 0,
      inputTokensByTurn: [],
      outputTokensByTurn: [],
      executionMsByTurn: [],
    };
  }
  return { tiers, lastUpdated: new Date().toISOString() };
}

/**
 * Enforce logical-turn accounting invariant:
 *   completedTurns + failedTurns <= turnCount
 *
 * failedTurns counts distinct logical turns that failed (at most one per turn),
 * never per-retry attempt or per-resume restart of the same turn.
 */
function clampFailedTurns(state: TierState): void {
  const maxFailed = Math.max(0, state.turnCount - state.completedTurns);
  if (state.failedTurns > maxFailed) {
    state.failedTurns = maxFailed;
  }
  if (state.failedTurns < 0) {
    state.failedTurns = 0;
  }
}

// ─── History reconstruction ──────────────────────────────────────────────────

/**
 * Reconstruct conversation history for Turn N from static TURN_CONTENTS
 * without making any API calls. History for turn N contains the contents
 * from turn 1 through turn N-1 (all successful turns that preceded it).
 */
function reconstructHistory(nextTurn: number): Array<{ speaker: string; text: string }> {
  const history: Array<{ speaker: string; text: string }> = [];
  for (let i = 0; i < nextTurn - 1; i++) {
    history.push({ speaker: 'Học sinh', text: TURN_CONTENTS[i % TURN_CONTENTS.length] });
  }
  return history;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function callController(sessionId: string, body: any): Promise<ControllerResponse> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const finish = (r: ControllerResponse) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(r);
    };

    const req: any = { params: { sessionId }, body };
    const res: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        finish({ status: this.statusCode, payload });
        return this;
      },
    };

    void handleDebateMessage(req, res);
    timer = setTimeout(() => finish({ status: 0, payload: { error: 'TIMEOUT' } }), CALL_TIMEOUT_MS);
  });
}

// ─── Error classification ────────────────────────────────────────────────────

interface ParsedError {
  errorType: 'QUOTA_EXCEEDED' | 'TRANSIENT' | 'UNKNOWN';
  retryDelayMs?: number;
  message: string;
}

function parseGeminiError(payload: any): ParsedError {
  const errStr = String(payload?.error ?? payload ?? '');

  if (
    /RESOURCE_EXHAUSTED/i.test(errStr) &&
    /GenerateRequestsPerDay|PerDayPerModel|PerDayPerProject|daily.*quota/i.test(errStr) &&
    !/GenerateRequestsPerMinute|PerMinutePer/i.test(errStr)
  ) {
    return { errorType: 'QUOTA_EXCEEDED', message: errStr.slice(0, 200) };
  }

  if (/503|UNAVAILABLE|high demand|429|RATE_LIMIT|TIMEOUT|RESOURCE_EXHAUSTED/i.test(errStr)) {
    const retryDelayMatch = errStr.match(/retryDelay['":\s]+["']?(\d+(?:\.\d+)?)s?/i)
      || errStr.match(/Please retry in\s+(\d+(?:\.\d+)?)\s*s/i);
    const retryDelayMs = retryDelayMatch
      ? Math.ceil(parseFloat(retryDelayMatch[1]) * 1000)
      : undefined;
    return { errorType: 'TRANSIENT', retryDelayMs, message: errStr.slice(0, 200) };
  }

  return { errorType: 'UNKNOWN', message: errStr.slice(0, 200) };
}

// ─── Single turn execution ───────────────────────────────────────────────────

async function runTurn(
  sessionId: string,
  turn: number,
  content: string,
  history: Array<{ speaker: string; text: string }>,
): Promise<TurnResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const start = Date.now();
    const res = await callController(sessionId, {
      userId: USER_ID,
      content,
      stance: STANCE,
      history,
    });
    const latencyMs = Date.now() - start;

    if (res.status === 200) {
      const opponentTokens = res.payload?.telemetry?.opponent?.tokens ?? {};
      const coachTokens = res.payload?.telemetry?.coach?.tokens ?? {};
      const promptTokens = (opponentTokens.prompt_tokens ?? 0) + (coachTokens.prompt_tokens ?? 0);
      const completionTokens = (opponentTokens.completion_tokens ?? 0) + (coachTokens.completion_tokens ?? 0);
      const executionMs = Math.max(
        res.payload?.telemetry?.opponent?.execution_ms ?? 0,
        res.payload?.telemetry?.coach?.execution_ms ?? 0,
        latencyMs,
      );

      return {
        turn,
        success: true,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        executionMs,
        latencyMs,
      };
    }

    const parsed = parseGeminiError(res.payload);

    if (parsed.errorType === 'QUOTA_EXCEEDED') {
      console.log(
        `    [DIAG] turn=${turn} attempt=${attempt}/${MAX_ATTEMPTS} status=${res.status} error_type=QUOTA_EXCEEDED abort=true err="${parsed.message}"`,
      );
      return { turn, success: false, inputTokens: 0, outputTokens: 0, executionMs: 0, latencyMs, error: parsed.message, quotaAborted: true };
    }

    if (attempt < MAX_ATTEMPTS) {
      let wait: number;
      if (parsed.retryDelayMs) {
        wait = parsed.retryDelayMs;
      } else {
        const baseWait = Math.min(2000 * 2 ** (attempt - 1), 8000);
        const jitter = Math.random() * baseWait * 0.2;
        wait = Math.round(baseWait + jitter);
      }

      console.log(
        `    [DIAG] turn=${turn} attempt=${attempt}/${MAX_ATTEMPTS} status=${res.status} error_type=${parsed.errorType} retry_delay=${wait}ms err="${parsed.message}"`,
      );
      await sleep(wait);
      continue;
    }

    console.log(
      `    [DIAG] turn=${turn} attempt=${attempt}/${MAX_ATTEMPTS} status=${res.status} error_type=${parsed.errorType} EXHAUSTED err="${parsed.message}"`,
    );
    return { turn, success: false, inputTokens: 0, outputTokens: 0, executionMs: 0, latencyMs, error: parsed.message };
  }

  return { turn, success: false, inputTokens: 0, outputTokens: 0, executionMs: 0, latencyMs: 0, error: 'MAX_ATTEMPTS_EXHAUSTED' };
}

// ─── Tier execution with checkpoint ─────────────────────────────────────────

let globalState: BenchmarkState;

async function runTier(tierName: string, state: TierState): Promise<void> {
  console.log(
    `\n=== ${tierName} (${state.turnCount} turns) session=${state.sessionId} resuming=turn ${state.nextTurn} ===`,
  );

  if (state.status === 'COMPLETED') {
    console.log(`    ${tierName}: already COMPLETED (${state.completedTurns}/${state.turnCount} turns) — skipping.`);
    return;
  }

  if (state.status === 'PAUSED') {
    console.log(
      `    ${tierName}: resuming from PAUSED at turn ${state.nextTurn}/${state.turnCount} ` +
      `(completed=${state.completedTurns}, failed_logical=${state.failedTurns})`,
    );
    // Transition PAUSED → RUNNING so the tier can proceed
    state.status = 'RUNNING';
  }

  // Repair inflated failedTurns from older resume double-counting (logical turns only)
  clampFailedTurns(state);

  for (let turn = state.nextTurn; turn <= state.turnCount; turn++) {
    const content = TURN_CONTENTS[(turn - 1) % TURN_CONTENTS.length];

    // Reconstruct history from static TURN_CONTENTS — zero API calls
    const history = reconstructHistory(turn);

    const result = await runTurn(state.sessionId, turn, content, history);

    if (result.success) {
      // If this logical turn was previously counted as failed (resume retry), clear that count
      if (state.completedTurns + state.failedTurns >= turn) {
        state.failedTurns = Math.max(0, state.failedTurns - 1);
      }
      state.inputTokensByTurn.push(result.inputTokens);
      state.outputTokensByTurn.push(result.outputTokens);
      state.executionMsByTurn.push(result.executionMs);
      state.completedTurns += 1;
      state.nextTurn = turn + 1;
      clampFailedTurns(state);

      console.log(
        `    turn ${turn}: SUCCESS in=${result.inputTokens} out=${result.outputTokens} exec=${result.executionMs}ms`,
      );
    } else {
      // ── STATE FIX: Any failure → PAUSED, keep nextTurn on the failed turn ──
      // failedTurns tracks LOGICAL turns that failed, not retry/resume attempts.
      // Count each logical turn at most once (even across N retries / resume restarts).
      if (state.completedTurns + state.failedTurns < turn) {
        state.failedTurns += 1;
      }
      clampFailedTurns(state);
      state.status = 'PAUSED';
      // nextTurn is NOT advanced — resume will retry this exact turn
      console.log(`    turn ${turn}: FAILED err="${result.error ?? 'unknown'}"`);

      if (result.quotaAborted) {
        console.log(`    ${tierName}: QUOTA_EXCEEDED — tier PAUSED at turn ${turn}. Resume after quota reset.`);
      } else {
        console.log(`    ${tierName}: TRANSIENT/UNKNOWN failure — tier PAUSED at turn ${turn}. Resume to retry.`);
      }

      saveCheckpoint(globalState);
      return; // Stop tier execution immediately on any failure
    }

    // Persist checkpoint after every successful turn
    saveCheckpoint(globalState);

    // Cooldown between turns
    if (turn < state.turnCount) {
      await sleep(COOLDOWN_MS);
    }
  }

  // ── STATE FIX: COMPLETED only when ALL turns succeeded ──
  if (state.completedTurns === state.turnCount) {
    state.status = 'COMPLETED';
    state.nextTurn = state.turnCount + 1;
    // No outstanding failed logical turns once every turn completed successfully
    state.failedTurns = 0;
  }
  saveCheckpoint(globalState);
}

// ─── Report rendering ────────────────────────────────────────────────────────

function renderReport(state: BenchmarkState): void {
  let totalCompleted = 0;
  let totalFailed = 0;

  console.log('\n\n===== BENCHMARK COMPLETE =====');

  for (const def of TIER_DEFS) {
    const ts = state.tiers[def.name];
    if (!ts) continue;
    totalCompleted += ts.completedTurns;
    totalFailed += ts.failedTurns;

    const totalIn = ts.inputTokensByTurn.reduce((s, v) => s + v, 0);
    const totalOut = ts.outputTokensByTurn.reduce((s, v) => s + v, 0);
    const totalTime = ts.executionMsByTurn.reduce((s, v) => s + v, 0);
    const avgIn = ts.completedTurns ? Math.round(totalIn / ts.completedTurns) : 0;
    const maxIn = ts.inputTokensByTurn.reduce((m, v) => Math.max(m, v), 0);

    console.log(
      `${def.name} (${ts.completedTurns + ts.failedTurns} turns) [${ts.status}]: ` +
      `Completed=${ts.completedTurns} Failed=${ts.failedTurns} In=${totalIn} Out=${totalOut} ` +
      `Time=${totalTime}ms AvgIn=${avgIn} MaxIn=${maxIn}`,
    );
  }

  const totalTurns = totalCompleted + totalFailed;
  const successRate = totalTurns ? ((totalCompleted / totalTurns) * 100).toFixed(1) : '0.0';
  console.log(`\nTotal: ${totalCompleted} / ${totalTurns} (${successRate}%) | Failed: ${totalFailed}`);

  // Context growth (STRESS)
  console.log('\n===== CONTEXT GROWTH (STRESS) =====');
  const stress = state.tiers['STRESS'];
  if (stress && stress.inputTokensByTurn.length > 0) {
    const series = stress.inputTokensByTurn;
    const firstIn = series[0] ?? 0;
    const lastIn = series[series.length - 1] ?? 0;
    const bloatPct = firstIn > 0 ? (((lastIn - firstIn) / firstIn) * 100).toFixed(1) : 'N/A';

    console.log(`Turn 1 input tokens:  ${firstIn}`);
    console.log(`Turn ${series.length} input tokens: ${lastIn}`);
    console.log(`Context bloat:        ${bloatPct}%`);

    const head = series.slice(0, 3);
    const mid = series.length > 6 ? series.slice(Math.floor(series.length / 2) - 1, Math.floor(series.length / 2) + 2) : [];
    const tail = series.slice(-3);
    console.log(`Series: [${head.join(', ')}${mid.length ? ', ...' + mid.join(', ') + ', ...' : ''}, ${tail.join(', ')}]`);
    console.log(`Full series: ${JSON.stringify(series)}`);
  } else {
    console.log('STRESS tier not enabled — skipping context growth analysis.');
  }
}

// ─── Signal handling ─────────────────────────────────────────────────────────

let shuttingDown = false;

async function handleSignal(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[SIGNAL] Received ${signal} — saving checkpoint and exiting...`);
  saveCheckpoint(globalState);
  await prisma.$disconnect();
  process.exit(0);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Register signal handlers
  process.on('SIGINT', () => { void handleSignal('SIGINT'); });
  process.on('SIGTERM', () => { void handleSignal('SIGTERM'); });

  console.log('=== TEXT DEBATE BENCHMARK (Resumable) ===');
  console.log(`Tiers: ${TIER_DEFS.map((t) => `${t.name}=${t.turns} turns`).join(', ')}`);
  console.log(`Checkpoint: ${CHECKPOINT_PATH}`);
  console.log(`Cooldown: ${COOLDOWN_MS}ms | Retry: max ${MAX_ATTEMPTS} | Timeout: ${CALL_TIMEOUT_MS}ms`);

  console.log('\nEnsuring benchmark user exists...');
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, phoneNumber: '+84900000000', displayName: 'Benchmark User' },
  });

  // Load or initialize checkpoint
  const existing = loadCheckpoint();
  globalState = existing ?? initFreshState();

  // Ensure newly enabled tiers exist without wiping completed ones (e.g. SHORT)
  for (const def of TIER_DEFS) {
    if (!globalState.tiers[def.name]) {
      globalState.tiers[def.name] = {
        sessionId: randomUUID(),
        status: 'RUNNING',
        nextTurn: 1,
        turnCount: def.turns,
        completedTurns: 0,
        failedTurns: 0,
        inputTokensByTurn: [],
        outputTokensByTurn: [],
        executionMsByTurn: [],
      };
      console.log(`[CHECKPOINT] Initialized new tier ${def.name} (session=${globalState.tiers[def.name].sessionId})`);
    }
  }

  if (!existing) {
    console.log('[CHECKPOINT] No existing state — initialized fresh.');
    saveCheckpoint(globalState);
  } else {
    for (const def of TIER_DEFS) {
      const ts = globalState.tiers[def.name];
      if (ts) {
        console.log(
          `  ${def.name}: session=${ts.sessionId} status=${ts.status} nextTurn=${ts.nextTurn}/${ts.turnCount} completed=${ts.completedTurns} failed=${ts.failedTurns}`,
        );
      }
    }
    saveCheckpoint(globalState);
  }

  // Run each tier
  for (const def of TIER_DEFS) {
    const tierState = globalState.tiers[def.name];
    if (!tierState) continue;
    await runTier(def.name, tierState);
  }

  // Final report
  renderReport(globalState);
}

main()
  .catch((err) => {
    console.error('Benchmark failed:', err);
    if (globalState) saveCheckpoint(globalState);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
