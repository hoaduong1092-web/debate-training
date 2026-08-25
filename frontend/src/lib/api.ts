/**
 * API client for the AI Debate Master Arena.
 *
 * Base URL is intentionally derived from the Vite dev/proxy configuration
 * rather than hard-coded as an absolute origin. In production the API is
 * served under the same origin at `/api/v1`.
 *
 * Updated for AI Opponent integration (Spec 17).
 */

export const API_BASE_URL = '/api/v1';

export type DebateStance = 'AFFIRMATIVE' | 'NEGATIVE';

// ─── Session Creation Types (Spec 17 §8.1) ──────────────────────────────────

export interface CreateSessionRequest {
  userId: string;
  topic: string;
  character_id: string;
  user_side: DebateStance;
  input_mode?: 'text' | 'voice';
  inputMode?: 'text' | 'voice';
}

export interface SessionInfo {
  id: string;
  topic: string;
  character_id: string | null;
  user_side: string | null;
  max_turns: number;
  status: string;
}

export interface CreateSessionResponse {
  success: boolean;
  session: SessionInfo;
}

// ─── Message Types (Spec 17 §8.2) ───────────────────────────────────────────

// Compact per-turn history entry sent to the Logic Coach for progress evaluation.
// Contains user argument text + compact coach feedback summary from that turn.
export interface CoachHistoryEntry {
  speaker: string;
  text: string;
  coachFeedback?: {
    score: number;
    fallacies_detected: string[];
    weaknesses: string[];
    actionable_suggestions: string[];
  };
}

/** Voice telemetry captured during a voice-mode turn. */
export interface VoiceMetricsPayload {
  wpm: number;
  fillerCount: number;
  durationMs: number;
  /** WPM tier label e.g. "OPTIMAL" | "TOO_FAST" | "TOO_SLOW" */
  tier?: string;
  stt_source?: 'voicestudio' | 'whisper' | 'mock';
}

export interface TurnArgumentContext {
  argumentId: string;
  order?: number;
  claim: string;
  reasoning?: string;
  evidenceSuggestion?: string;
}

export interface MessageRequestBody {
  userId: string;
  content: string;
  stance: DebateStance;
  /** Active debate topic — used by the backend to sync session.topic and prevent
   *  false Red Herring penalties from the Logic Coach when topics differ. */
  topic?: string;
  /** Optional target argument context for structured debate coaching grounding */
  argumentContext?: TurnArgumentContext;
  /** Compact history of prior turns with coach feedback, for progress evaluation.
   *  Server falls back to plain DB history if omitted. */
  coachHistory?: CoachHistoryEntry[];
  /** Optional voice metrics captured during this turn (voice mode only). */
  voiceMetrics?: VoiceMetricsPayload;
}

export interface CreAnalysis {
  claim: string;
  reasoning: string;
  evidence: string;
}

export interface CoachFeedback {
  score: number | null;
  cre_analysis: CreAnalysis;
  fallacies_detected: string[];
  strengths: string[];
  weaknesses: string[];
  actionable_suggestions: string[];
}

export interface OpponentResponse {
  text: string;
  character_id: string | null;
  audio_path?: string | null;
  audio_url?: string | null;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

export interface TelemetryEntry {
  tokens: TokenUsage;
  execution_ms: number;
}

export interface MessageResponse {
  success: boolean;
  data: {
    opponent_response: OpponentResponse;
    coach_feedback: CoachFeedback | null;
    /** Voice telemetry echoed from backend — present only in voice mode turns. */
    voice_telemetry?: {
      wpm: number;
      filler_count: number;
      duration_ms: number;
      tier: string | null;
      stt_source: string | null;
    } | null;
  };
  telemetry: {
    opponent: TelemetryEntry;
    coach: TelemetryEntry;
  };
  turn_number: number;
  turns_remaining: number;
  session_completed?: boolean;
}

// ─── Legacy types (kept for backward compat during transition) ───────────────

export interface HistoryCoachFeedback {
  score: number;
  fallacies_detected: string[];
  weaknesses: string[];
  actionable_suggestions: string[];
}

export interface HistoryTurn {
  speaker: string;
  text: string;
  coachFeedback?: HistoryCoachFeedback;
}

// ─── Error Handling ──────────────────────────────────────────────────────────

export interface ApiErrorPayload {
  error?: string;
  message?: string;
}

export class ArenaApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ArenaApiError';
    this.status = status;
  }
}

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'Unexpected response from server.';
  }
  const candidate = payload as ApiErrorPayload;
  return candidate.error || candidate.message || 'Unexpected response from server.';
}

// ─── Session Creation API ────────────────────────────────────────────────────

/**
 * POST /api/v1/arena/debates — Create a new debate session.
 * Consumes 1 TEXT_DEBATE credit.
 * Spec: 17_AI_OPPONENT_SPEC.md §8.1
 */
export async function createDebateSession(
  body: CreateSessionRequest,
): Promise<CreateSessionResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/arena/debates`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  if (!payload || typeof payload !== 'object') {
    throw new ArenaApiError(response.status, 'Invalid response payload.');
  }

  return payload as CreateSessionResponse;
}

// ─── Complete Session API ─────────────────────────────────────────────────────

export interface CompleteSessionResponse {
  success: boolean;
  session: {
    id: string;
    topic: string;
    status: string;
    turn_count: number;
    updated_at: string;
  };
  voice_session?: VoiceSessionDTO | null;
  quota?: QuotaInfo | null;
}

/**
 * PUT /api/v1/arena/sessions/:sessionId/complete
 * Marks a session as COMPLETED and finalizes any linked VoiceSession atomically.
 */
export async function completeDebateSession(
  sessionId: string,
  userId: string,
  actualDurationMs?: number,
): Promise<CompleteSessionResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/arena/sessions/${sessionId}/complete`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ userId, actualDurationMs }),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as CompleteSessionResponse;
}



/**
 * POST /api/v1/arena/sessions/:sessionId/message — Send a debate turn.
 * Does NOT consume quota (consumed at session creation).
 * Spec: 17_AI_OPPONENT_SPEC.md §8.2
 */
export async function sendDebateMessage(
  sessionId: string,
  body: MessageRequestBody,
): Promise<MessageResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/arena/sessions/${sessionId}/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  if (!payload || typeof payload !== 'object') {
    throw new ArenaApiError(response.status, 'Invalid response payload.');
  }

  const envelope = payload as Record<string, unknown>;
  const data = envelope.data as Record<string, unknown> | undefined;

  if (!data) {
    throw new ArenaApiError(response.status, 'Missing data in response.');
  }

  // Validate composite response shape.
  const opponentResponse = data.opponent_response;
  if (!opponentResponse || typeof opponentResponse !== 'object') {
    throw new ArenaApiError(response.status, 'Missing opponent_response in data.');
  }

  const coachFeedback = data.coach_feedback;
  const validatedCoach = isCoachFeedback(coachFeedback) ? coachFeedback : null;

  return {
    success: envelope.success === true,
    data: {
      opponent_response: opponentResponse as OpponentResponse,
      coach_feedback: validatedCoach,
    },
    telemetry: {
      opponent: normalizeTelemetryEntry((envelope.telemetry as any)?.opponent),
      coach: normalizeTelemetryEntry((envelope.telemetry as any)?.coach),
    },
    turn_number: typeof envelope.turn_number === 'number' ? envelope.turn_number : 0,
    turns_remaining: typeof envelope.turns_remaining === 'number' ? envelope.turns_remaining : 0,
    session_completed: envelope.session_completed === true ? true : undefined,
  };
}

// ─── Validation Helpers ──────────────────────────────────────────────────────

function isCoachFeedback(value: unknown): value is CoachFeedback {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (v.score !== null && (typeof v.score !== 'number' || !Number.isFinite(v.score) || v.score < 0 || v.score > 10)) {
    return false;
  }
  const cre = v.cre_analysis;
  if (!cre || typeof cre !== 'object') {
    return false;
  }
  const c = cre as Record<string, unknown>;
  return (
    typeof c.claim === 'string' &&
    typeof c.reasoning === 'string' &&
    typeof c.evidence === 'string' &&
    isStringArray(v.fallacies_detected) &&
    isStringArray(v.strengths) &&
    isStringArray(v.weaknesses) &&
    isStringArray(v.actionable_suggestions)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function normalizeTelemetryEntry(entry: unknown): TelemetryEntry {
  if (!entry || typeof entry !== 'object') {
    return { tokens: { prompt_tokens: 0, completion_tokens: 0 }, execution_ms: 0 };
  }
  const e = entry as Record<string, unknown>;
  const tokens = e.tokens as Record<string, unknown> | undefined;
  return {
    tokens: {
      prompt_tokens: typeof tokens?.prompt_tokens === 'number' ? tokens.prompt_tokens : 0,
      completion_tokens: typeof tokens?.completion_tokens === 'number' ? tokens.completion_tokens : 0,
    },
    execution_ms: typeof e.execution_ms === 'number' ? e.execution_ms : 0,
  };
}

// ─── History API Types ────────────────────────────────────────────────────────

/** Summary entry returned by GET /sessions?userId=... */
export interface SessionSummary {
  id: string;
  topic: string;
  status: string;
  character_id: string | null;
  user_side: string | null;
  turn_count: number;
  last_evidence_star: number | null;
  created_at: string;
  updated_at: string;
}

/** Response shape for GET /sessions?userId=... */
export interface ListSessionsResponse {
  success: boolean;
  total: number;
  limit: number;
  offset: number;
  sessions: SessionSummary[];
}

/** A single transcript turn from GET /sessions/:id */
export interface TranscriptTurn {
  id: string;
  speaker_type: 'user' | 'ai' | string;
  turn_number: number;
  text_content: string;
  fallacies_detected: unknown;
  evidence_star: number | null;
  created_at: string;
}

export interface HistorySessionSummary {
  id: string;
  topic: string;
  topic_title?: string;
  status: string;
  character_id?: string;
  user_side: DebateStance | string;
  input_mode?: 'text' | 'voice' | string;
  score_total?: number;
  score_content?: number | null;
  score_style?: number | null;
  score_strategy?: number | null;
  turn_count: number;
  last_evidence_star?: number | null;
  created_at: string;
}

export interface ReplayTranscriptTurn {
  id: string;
  speaker_type: 'user' | 'opponent' | string;
  speakerType?: 'user' | 'opponent' | string;
  turn_number: number;
  turnNumber?: number;
  text_content: string;
  textContent?: string;
  audio_path?: string | null;
  audioPath?: string | null;
  fallacies_detected?: string[];
  fallacies?: string[];
  evidence_star?: number | null;
  evidenceStar?: number | null;
  coach_feedback?: {
    score?: number;
    cre_analysis?: {
      claim?: string;
      reasoning?: string;
      evidence?: string;
    };
    strengths?: string[];
    weaknesses?: string[];
    actionable_suggestions?: string[];
  };
  coachFeedback?: any;
  voice_metrics?: {
    wpm?: number;
    filler_count?: number;
    duration_ms?: number;
    pace_label?: string;
    pace_tip?: string;
  } | null;
  voiceMetrics?: any;
  created_at: string;
}

export interface ReplaySessionDetails {
  success: boolean;
  session: {
    id: string;
    topic: string;
    topic_title?: string;
    status: string;
    character_id: string;
    user_side: string;
    input_mode?: string;
    score_total?: number;
    score_content?: number | null;
    score_style?: number | null;
    score_strategy?: number | null;
    max_turns: number;
    created_at: string;
  };
  turns: ReplayTranscriptTurn[];
  transcripts?: ReplayTranscriptTurn[];
}

/** Response shape for GET /sessions/:sessionId */
export interface SessionDetailResponse {
  success: boolean;
  session: {
    id: string;
    topic: string;
    status: string;
    character_id: string | null;
    user_side: string | null;
    max_turns: number;
    created_at: string;
    updated_at: string;
  };
  turns: TranscriptTurn[];
}

// ─── History API Functions ────────────────────────────────────────────────────

/**
 * GET /api/v1/arena/sessions?userId=<uuid>&limit=<n>&offset=<n>
 * Returns paginated list of debate sessions for a user.
 */
export async function listUserSessions(
  userId?: string,
  limit = 20,
  offset = 0,
): Promise<ListSessionsResponse> {
  const targetUserId = userId || '22222222-2222-2222-2222-222222222222';
  const params = new URLSearchParams({
    userId: targetUserId,
    limit: String(limit),
    offset: String(offset),
  });
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/arena/sessions?${params.toString()}`, {
    headers,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as ListSessionsResponse;
}

export async function fetchDebateHistory(userId?: string): Promise<{ success: boolean; sessions: HistorySessionSummary[] }> {
  const res = await listUserSessions(userId, 50, 0);
  return {
    success: res.success,
    sessions: res.sessions as unknown as HistorySessionSummary[],
  };
}

/**
 * GET /api/v1/arena/sessions/:sessionId
 * Returns full session with all transcript turns for static replay.
 */
export async function fetchSessionDetail(sessionId: string): Promise<SessionDetailResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/arena/sessions/${sessionId}`, {
    headers,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as SessionDetailResponse;
}

export async function fetchDebateReplay(sessionId: string): Promise<ReplaySessionDetails> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/arena/sessions/${sessionId}`, {
    headers,
  });
  let payload: any;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }
  return payload as ReplaySessionDetails;
}

/**
 * DELETE /api/v1/arena/sessions/:sessionId
 * Permanently removes a session and all its transcripts.
 */
export async function deleteSessionApi(sessionId: string): Promise<{ success: boolean; deleted: string }> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/arena/sessions/${sessionId}`, {
    method: 'DELETE',
    headers,
  });

  let payload: unknown;
  try { payload = await response.json(); } catch { payload = null; }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as { success: boolean; deleted: string };
}

/**
 * DELETE /api/v1/arena/sessions
 *
 * Bulk-deletes multiple sessions or all sessions for the current user.
 * Pass `{ sessionIds: string[] }` to delete specific sessions, or
 * `{ deleteAll: true }` to wipe the full history.
 */
export async function bulkDeleteSessions(payload: {
  sessionIds?: string[];
  deleteAll?: boolean;
}): Promise<{ success: boolean; deletedCount: number }> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/arena/sessions`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(payload),
  });

  let data: unknown;
  try { data = await response.json(); } catch { data = null; }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(data));
  }

  return data as { success: boolean; deletedCount: number };
}

// ─── Assistant Domain Types (Task §1.A / §1.B) ───────────────────────────────

/** A single argument entry in a Speech Draft. */
export interface SpeechArgument {
  claim: string;
  reasoning: string;
  evidence_suggestion: string;
}

/** A single counterargument entry in a Speech Draft. */
export interface SpeechCounterargument {
  opposing_point: string;
  rebuttal_strategy: string;
}

/** Full Speech Draft artifact returned by POST /api/v1/speeches/draft. */
export interface SpeechDraftResult {
  title: string;
  hook: string;
  arguments: SpeechArgument[];
  counterarguments: SpeechCounterargument[];
  conclusion: string;
}

// ─── Canonical Draft Workspace & FinalDebateDraft Contracts (Contract Closure v1.1) ─

export interface WorkspaceArgument {
  readonly argumentId: string;
  order: number;
  claim: string;
  reasoning: string;
  evidenceSuggestion: string;
  isCustomAdded?: boolean;
}

export interface WorkspaceCounterargument {
  readonly counterargumentId: string;
  order: number;
  opponentArgument: string;
  rebuttal: string;
  isCustomAdded?: boolean;
}

export interface DraftWorkspaceState {
  readonly draftId: string;
  topic: string;
  stance: DebateStance;
  hook: string;
  arguments: WorkspaceArgument[];
  counterarguments: WorkspaceCounterargument[];
  conclusion: string;
  isDirty: boolean;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinalArgument {
  readonly argumentId: string;
  readonly order: number;
  readonly claim: string;
  readonly reasoning: string;
  readonly evidenceSuggestion: string;
}

export interface FinalCounterargument {
  readonly counterargumentId: string;
  readonly order: number;
  readonly opponentArgument: string;
  readonly rebuttal: string;
}

export interface FinalDebateDraft {
  readonly draftId: string;
  readonly topic: string;
  readonly stance: DebateStance;
  readonly hook: string;
  readonly arguments: readonly FinalArgument[];
  readonly counterarguments: readonly FinalCounterargument[];
  readonly conclusion: string;
  readonly isUserConfirmed: true;
  readonly confirmedAt: string;
}

export interface ArenaHandoffPayload {
  readonly topic: string;
  readonly stance: DebateStance;
  readonly format?: 'WSDC' | 'AP' | 'BP';
  readonly finalDraft: FinalDebateDraft;
  readonly legacyDraftText?: string;
}

/** Request body for POST /api/v1/speeches/draft. */
export interface SpeechDraftRequest {
  topic: string;
  stance: DebateStance;
  rawIdeas?: string;
  language?: string;
}

/** Response envelope for POST /api/v1/speeches/draft. */
export interface SpeechDraftResponse {
  success: boolean;
  data: SpeechDraftResult;
}

/** A single case entry (affirmative or negative) in a Motion Analysis. */
export interface MotionCase {
  claim: string;
  key_argument: string;
  burden_of_proof: string;
}

/** Full Motion Analysis artifact returned by POST /api/v1/reports/analyze. */
export interface MotionAnalysisResult {
  motion_title: string;
  core_conflict: string;
  stakeholders: string[];
  affirmative_cases: MotionCase[];
  negative_cases: MotionCase[];
  rebuttal_vectors: string[];
}

/** Request body for POST /api/v1/reports/analyze. */
export interface MotionAnalysisRequest {
  topic: string;
  context?: string;
  language?: string;
}

/** Response envelope for POST /api/v1/reports/analyze. */
export interface MotionAnalysisResponse {
  success: boolean;
  data: MotionAnalysisResult;
}

// ─── Assistant Domain API Functions ─────────────────────────────────────────

/**
 * POST /api/v1/speeches/draft
 * Generates a structured Speech Draft artifact.
 * Consumes 1 ASSISTANT credit on success only (post-validate semantics).
 * Spec: Task §1.A, 04_API_SPEC.md §5
 */
export async function createSpeechDraft(body: SpeechDraftRequest): Promise<SpeechDraftResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/speeches/draft`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  if (!payload || typeof payload !== 'object') {
    throw new ArenaApiError(response.status, 'Invalid response payload.');
  }

  return payload as SpeechDraftResponse;
}

/**
 * POST /api/v1/reports/analyze
 * Generates a structured Motion Analysis Report artifact.
 * Consumes 1 ASSISTANT credit on success only (post-validate semantics).
 * Spec: Task §1.B, 04_API_SPEC.md §5
 */
export async function createMotionAnalysis(body: MotionAnalysisRequest): Promise<MotionAnalysisResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/reports/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  if (!payload || typeof payload !== 'object') {
    throw new ArenaApiError(response.status, 'Invalid response payload.');
  }

  return payload as MotionAnalysisResponse;
}

/** Alias for createMotionAnalysis conforming to Step 3.3 */
export const analyzeMotion = createMotionAnalysis;

// ─── Argument Refinement Types & API (AI_ARGUMENT_REFINEMENT_SPEC.md §11) ───

/** Request body for POST /api/v1/arguments/refine. */
export interface ArgumentRefinementRequest {
  rawText: string;
  stance: 'AFFIRMATIVE' | 'NEGATIVE';
  topic?: string;
  existingClaim?: string;
  existingReasoning?: string;
  existingEvidenceSuggestion?: string;
  language?: 'vi' | 'en';
}

/** C-R-E candidate returned by AI Argument Refinement. */
export interface ArgumentRefinementCandidate {
  claim: string;
  reasoning: string;
  evidenceSuggestion: string;
  refinementNote: string;
}

/** Response envelope for POST /api/v1/arguments/refine. */
export interface ArgumentRefinementResponse {
  success: boolean;
  data: ArgumentRefinementCandidate;
}

/**
 * POST /api/v1/arguments/refine
 * AI Argument Refinement — refines raw user idea into structured C-R-E format.
 * Consumes 1 ASSISTANT credit on success only (post-validate semantics).
 * Spec: AI_ARGUMENT_REFINEMENT_SPEC.md §11
 */
export async function refineArgument(body: ArgumentRefinementRequest): Promise<ArgumentRefinementResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/arguments/refine`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  if (!payload || typeof payload !== 'object') {
    throw new ArenaApiError(response.status, 'Invalid response payload.');
  }

  return payload as ArgumentRefinementResponse;
}

// ─── Plaza Domain Types ──────────────────────────────────────────────────────

/** A single item in the Plaza Feed. */
export interface PlazaItem {
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
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
  created_at: string;
}

/** Response envelope for GET /api/v1/plaza/feed. */
export interface PlazaFeedResponse {
  success: boolean;
  total: number;
  sort: string;
  limit?: number;
  offset?: number;
  items: PlazaItem[];
}

/** CRE (Claim-Reasoning-Evidence) breakdown for a user turn. */
export interface PlazaCre {
  claim: string;
  reasoning: string;
  evidence: string;
}

/** Logic Coach feedback embedded in a Plaza turn. */
export interface PlazaCoachFeedback {
  score: number;
  strengths: string[];
  weaknesses: string[];
  actionable_suggestions: string[];
}

/** A single turn in a Plaza debate detail. */
export interface PlazaDetailTurn {
  turn_number: number;
  speaker_type: 'user' | 'ai';
  text_content: string;
  cre: PlazaCre | null;
  fallacies_detected: string[];
  evidence_star: number | null;
  coach_feedback: PlazaCoachFeedback | null;
}

/** Session metadata in a Plaza detail response. */
export interface PlazaDetailSession {
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
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
  created_at: string;
}

/** Response envelope for GET /api/v1/plaza/sessions/:sessionId. */
export interface PlazaDetailResponse {
  success: boolean;
  session: PlazaDetailSession;
  turns: PlazaDetailTurn[];
}

/** Response envelope for POST /like, DELETE /like, etc. */
export interface PlazaInteractionResponse {
  success: boolean;
  session_id: string;
  is_liked?: boolean;
  like_count?: number;
  is_favorited?: boolean;
  view_count?: number;
}

// ─── Plaza Domain API Functions ──────────────────────────────────────────────

/**
 * GET /api/v1/plaza/feed
 * Fetches the curated Plaza Feed of public debate sessions.
 * Supports sorting ("latest" | "popular"), keyword search, and pagination.
 *
 * STRICT NO-LLM: Zero quota deduction.
 * Spec: Master Blueprint v16.x, PLAZA_PHASE1_IMPLEMENTATION_TASK.md
 */
export async function fetchPlazaFeed(
  sort: 'latest' | 'popular' = 'latest',
  query = '',
  limit = 20,
  offset = 0,
): Promise<PlazaFeedResponse> {
  const params = new URLSearchParams({ sort, limit: String(limit), offset: String(offset) });
  if (query.trim()) params.set('query', query.trim());

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/plaza/feed?${params.toString()}`, { headers });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as PlazaFeedResponse;
}

/**
 * POST /api/v1/plaza/sessions/:sessionId/like
 * Adds like for the current user on a Plaza session.
 */
export async function addPlazaLike(sessionId: string): Promise<PlazaInteractionResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/plaza/sessions/${sessionId}/like`, {
    method: 'POST',
    headers,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as PlazaInteractionResponse;
}

/**
 * DELETE /api/v1/plaza/sessions/:sessionId/like
 * Removes like for the current user on a Plaza session.
 */
export async function removePlazaLike(sessionId: string): Promise<PlazaInteractionResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/plaza/sessions/${sessionId}/like`, {
    method: 'DELETE',
    headers,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as PlazaInteractionResponse;
}

/**
 * POST /api/v1/plaza/sessions/:sessionId/favorite
 * Bookmarks session for the current user.
 */
export async function addPlazaFavorite(sessionId: string): Promise<PlazaInteractionResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/plaza/sessions/${sessionId}/favorite`, {
    method: 'POST',
    headers,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as PlazaInteractionResponse;
}

/**
 * DELETE /api/v1/plaza/sessions/:sessionId/favorite
 * Removes bookmark for the current user.
 */
export async function removePlazaFavorite(sessionId: string): Promise<PlazaInteractionResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/plaza/sessions/${sessionId}/favorite`, {
    method: 'DELETE',
    headers,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as PlazaInteractionResponse;
}

/**
 * POST /api/v1/plaza/sessions/:sessionId/view
 * Increments and records view count for a Plaza session.
 */
export async function recordPlazaView(sessionId: string): Promise<PlazaInteractionResponse> {
  const response = await fetch(`${API_BASE_URL}/plaza/sessions/${sessionId}/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as PlazaInteractionResponse;
}

/**
 * Backward compatibility helpers
 */
export async function togglePlazaLike(sessionId: string, currentlyLiked = false): Promise<PlazaInteractionResponse> {
  return currentlyLiked ? removePlazaLike(sessionId) : addPlazaLike(sessionId);
}

export async function togglePlazaFavorite(sessionId: string, currentlyFavorited = false): Promise<PlazaInteractionResponse> {
  return currentlyFavorited ? removePlazaFavorite(sessionId) : addPlazaFavorite(sessionId);
}

/**
 * GET /api/v1/plaza/sessions/:sessionId
 * Fetches the complete static transcript, C-R-E analysis, and Logic Coach
 * feedback for a Plaza public debate.
 *
 * STRICT NO-LLM & STATIC READ: Zero quota deduction, no LLM calls.
 * Spec: Master Blueprint v16.x, PLAZA_PHASE1_IMPLEMENTATION_TASK.md
 */
export async function fetchPlazaDetail(sessionId: string): Promise<PlazaDetailResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/plaza/sessions/${sessionId}`, { headers });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as PlazaDetailResponse;
}

// ─── Profile & Subscription Domain Types ─────────────────────────────────────

/** User identity part of a profile response. */
export interface UserProfileInfo {
  id: string;
  full_name: string;
  display_name?: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  role: string;
  created_at: string;
}

/** Subscription state for the current user. */
export interface UserSubscriptionInfo {
  plan: 'COMPETITION_7D' | 'BASIC' | 'STANDARD' | 'PREMIUM' | string | null;
  status: string | null;
  usable: boolean;
  period_start?: string | null;
  period_end: string | null;
}

/** Granular balance details for a dimension. */
export interface DimensionBalanceInfo {
  subscription_remaining: number;
  credit_pack_remaining: number;
  total_available: number;
  limit: number;
}

/** Active credit pack batch owned by user. */
export interface UserCreditPackItem {
  id: string;
  pack_code: string;
  dimension: string;
  total_units: number;
  remaining_units: number;
  expires_at: string;
}

/** Real-time quota balances with dual-entitlement breakdown. */
export interface UserQuotaInfo {
  text?: DimensionBalanceInfo;
  voice?: DimensionBalanceInfo;
  audio?: DimensionBalanceInfo;
  assistant?: DimensionBalanceInfo;
  text_remaining: number;
  text_limit: number;
  voice_remaining?: number;
  voice_limit?: number;
  audio_remaining: number;
  audio_limit: number;
  assistant_remaining: number;
  assistant_limit: number;
  /** Derived: audio_remaining × 900 seconds (1 session ≤ 15 min). */
  voice_seconds_remaining: number;
  voice_seconds_limit: number;
}

/** User session statistics. */
export interface UserStatsInfo {
  total_sessions: number;
  completed_sessions: number;
}

/** Full response from GET /api/v1/users/profile. */
export interface UserProfileResponse {
  success: boolean;
  profile: UserProfileInfo;
  subscription: UserSubscriptionInfo;
  quota: UserQuotaInfo;
  credit_packs?: UserCreditPackItem[];
  stats: UserStatsInfo;
}

/** Payload for PUT /api/v1/users/profile. */
export interface UpdateProfilePayload {
  full_name?: string;
  language_preference?: 'vi' | 'en';
}

/** Response for PUT /api/v1/users/profile. */
export interface UpdateProfileResponse {
  success: boolean;
  profile: {
    id: string;
    full_name: string;
    role: string;
    language_preference: string | null;
    updated_at: string;
  };
}

/** A single subscription plan tier. */
export interface PlanTierItem {
  code: 'COMPETITION_7D' | 'BASIC' | 'STANDARD' | 'PREMIUM' | string;
  display_name: string;
  list_price_vnd: number;
  duration_days?: number;
  limits: {
    text: number;
    voice?: number;
    audio: number;
    assistant: number;
  };
  features_vi: string[];
  features_en: string[];
}

/** Credit pack add-on definition (Locked Active Catalog v1.0). */
export interface CreditPackItem {
  code: 'PACK_VOICE_15' | 'PACK_VOICE_60' | 'PACK_TEXT_10' | 'PACK_ASST_5' | string;
  display_name: string;
  list_price_vnd: number;
  duration_days: number;
  dimension: 'voice' | 'audio' | 'text' | 'assistant';
  units: number;
  description_vi: string;
  description_en: string;
}

/** VIP time pass definition (Locked Active Catalog v1.0). */
export interface VipPassItem {
  code: 'VIP_1D' | 'VIP_3D' | 'VIP_7D' | 'VIP_30D' | string;
  display_name: string;
  list_price_vnd: number;
  duration_days: number;
  description_vi: string;
  description_en: string;
}

/** Response from GET /api/v1/plans. */
export interface PlansResponse {
  success: boolean;
  plans: PlanTierItem[];
  credit_packs?: CreditPackItem[];
  vip_passes?: VipPassItem[];
}

/** User payment order DTO (Phase C1-A Transaction History). */
export interface PaymentOrderDTO {
  id: string;
  orderCode: string;
  itemCode: string;
  itemName: string;
  itemType: 'PLAN' | 'CREDIT_PACK' | 'VIP';
  amountVnd: number;
  provider: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | string;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrdersResponse {
  success: boolean;
  total: number;
  orders: PaymentOrderDTO[];
}

// ─── Payment & Checkout Types ────────────────────────────────────────────────

export interface CreateCheckoutSessionRequest {
  itemType?: 'PLAN' | 'CREDIT_PACK' | 'VIP' | 'BUNDLE';
  itemCode?: string;
  planTier?: string;
  provider?: 'VNPAY' | 'MOMO' | 'SEPAY' | 'SANDBOX';
}

export interface CreateCheckoutSessionResponse {
  success: boolean;
  orderId: string;
  orderCode: string;
  amount: number;
  displayName: string;
  itemType: 'PLAN' | 'CREDIT_PACK' | 'VIP' | 'BUNDLE';
  itemCode: string;
  planTier?: string;
  provider: 'VNPAY' | 'MOMO' | 'SEPAY' | 'SANDBOX';
  checkoutUrl: string;
  qrPayload: string;
  qrImageUrl?: string;
  transferMemo?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface SandboxUpgradeRequest {
  itemType?: 'PLAN' | 'CREDIT_PACK' | 'VIP' | 'BUNDLE';
  itemCode?: string;
  planTier?: string;
}

export interface SandboxUpgradeResponse {
  success: boolean;
  message: string;
  orderCode: string;
  itemType: 'PLAN' | 'CREDIT_PACK' | 'VIP' | 'BUNDLE';
  itemCode: string;
  plan?: string;
  quotaStatus: any;
}

export interface WebhookSimulationRequest {
  orderCode: string;
  provider?: string;
  status?: string;
  transactionId?: string;
  amount?: number;
  providerPayload?: Record<string, unknown>;
}

export interface WebhookSimulationResponse {
  success: boolean;
  message: string;
  orderCode?: string;
  status?: string;
}

// ─── Profile & Subscription API Functions ────────────────────────────────────

/**
 * GET /api/v1/users/profile
 * Returns user identity, real-time quota balances, and session statistics.
 *
 * STRICT NO-LLM: Zero quota deduction.
 * Spec: docs/02_DOMAIN_SPEC.md §9.2
 */
export async function fetchUserProfile(): Promise<UserProfileResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/users/profile`, { headers });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as UserProfileResponse;
}

/**
 * PUT /api/v1/users/profile
 * Updates editable profile fields (full_name and/or language_preference).
 *
 * STRICT NO-LLM: Zero quota deduction.
 * Spec: docs/02_DOMAIN_SPEC.md §9.3
 */
export async function updateUserProfile(
  payload: UpdateProfilePayload,
): Promise<UpdateProfileResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(body));
  }

  return body as UpdateProfileResponse;
}

/**
 * GET /api/v1/plans
 * Returns the subscription tier catalogue & credit packs.
 *
 * STRICT NO-LLM: Zero quota deduction.
 * Spec: docs/16_PLAN_QUOTA_BUSINESS_SPEC.md v1.1.0
 */
export async function fetchSubscriptionPlans(): Promise<PlansResponse> {
  const response = await fetch(`${API_BASE_URL}/plans`);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as PlansResponse;
}

/**
 * POST /api/v1/payments/checkout
 * Initiates checkout session & generates PaymentOrder with Server-Authoritative pricing.
 */
export async function createCheckoutSession(
  payload: CreateCheckoutSessionRequest,
): Promise<CreateCheckoutSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/payments/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(data));
  }

  return data as CreateCheckoutSessionResponse;
}

/**
 * POST /api/v1/payments/sandbox-upgrade
 * Instant top-up / upgrade for development/testing sandbox mode.
 */
export async function sandboxDirectUpgrade(
  payload: SandboxUpgradeRequest,
): Promise<SandboxUpgradeResponse> {
  const response = await fetch(`${API_BASE_URL}/payments/sandbox-upgrade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(data));
  }

  return data as SandboxUpgradeResponse;
}

/**
 * POST /api/v1/payments/webhook
 * Simulates / delivers payment webhook notification to server.
 */
export async function notifyPaymentWebhook(
  payload: WebhookSimulationRequest,
): Promise<WebhookSimulationResponse> {
  const response = await fetch(`${API_BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(data));
  }

  return data as WebhookSimulationResponse;
}

/**
 * GET /api/v1/payments/orders
 * Returns authenticated user's payment order history.
 * Spec: Phase C1-A Transaction History
 */
export async function fetchUserOrders(limit = 50, skip = 0): Promise<UserOrdersResponse> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/payments/orders?limit=${limit}&skip=${skip}`, {
    headers,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as UserOrdersResponse;
}

// ─── Team Pass & Bundles API Types ──────────────────────────────────────────

export interface TeamSeatUser {
  id: string;
  full_name: string | null;
  phone_number: string | null;
}

export interface TeamSeat {
  id: string;
  seatNumber: number;
  status: 'VACANT' | 'ASSIGNED';
  assignedUser: TeamSeatUser | null;
}

export interface TeamInvitation {
  id: string;
  invitationCode: string;
  status: 'ISSUED' | 'REDEEMED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  redeemedAt: string | null;
}

export interface TeamGroupItem {
  id: string;
  bundleCode: string;
  displayName: string;
  totalSeats: number;
  assignedSeatsCount: number;
  seats: TeamSeat[];
  invitations: TeamInvitation[];
}

export interface MyTeamsResponse {
  success: boolean;
  teams: TeamGroupItem[];
}

export interface RedeemInviteResponse {
  success: boolean;
  message: string;
  teamGroupId?: string;
  bundleCode?: string;
  targetPlan?: string;
  seatNumber?: number;
  error?: string;
}

/**
 * POST /api/v1/teams/redeem
 * Redeem a Team Pass / School Bundle invitation code.
 */
export async function redeemTeamInvite(
  invitationCode: string,
): Promise<RedeemInviteResponse> {
  const response = await fetch(`${API_BASE_URL}/teams/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invitationCode }),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(data));
  }

  return data as RedeemInviteResponse;
}

/**
 * GET /api/v1/teams/my-teams
 * Fetch user's team groups, seat rosters, and invitation codes.
 */
export async function fetchMyTeams(): Promise<MyTeamsResponse> {
  const response = await fetch(`${API_BASE_URL}/teams/my-teams`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ArenaApiError(response.status, extractErrorMessage(data));
  }

  return data as MyTeamsResponse;
}

// ─── Blueprint v15.0.0 Auth, Session & Dynamic Quota Types ───────────────────

export interface QuotaInfo {
  textTurnsRemaining: number;
  voiceMinsRemaining: number;
  assistantRemaining: number;
  lastResetAt: string;
}

export interface DynamicPlan {
  id: string;
  name: string;
  billingCycle?: 'monthly' | 'yearly';
  billing_cycle?: 'monthly' | 'yearly';
  priceVnd: number;
  durationDays?: number;
  duration_days?: number;
  textTurnsQuota: number;
  voiceMinsQuota: number;
  voiceSecondsQuota?: number;
  assistantQuota: number;
  isPopular?: boolean;
  is_popular?: boolean;
  features?: string[];
  features_vi?: string[];
  features_en?: string[];
  isActive: boolean;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  phone?: string;
  devOtp?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  token: string;
  sessionId: string;
  user: {
    id: string;
    phoneNumber: string;
    displayName: string;
    avatarUrl: string | null;
    quota?: QuotaInfo;
  };
}

// ─── Token & Session Management ──────────────────────────────────────────────

let currentAuthToken: string | null = null;
let currentSessionId: string | null = null;

export function setAuthToken(token: string | null): void {
  currentAuthToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken(): string | null {
  if (!currentAuthToken) {
    currentAuthToken = localStorage.getItem('auth_token');
  }
  return currentAuthToken;
}

export function setSessionId(sessionId: string | null): void {
  currentSessionId = sessionId;
  if (sessionId) {
    localStorage.setItem('auth_session_id', sessionId);
  } else {
    localStorage.removeItem('auth_session_id');
  }
}

export function getSessionId(): string | null {
  if (!currentSessionId) {
    currentSessionId = localStorage.getItem('auth_session_id');
  }
  return currentSessionId;
}

export function clearAuth(): void {
  currentAuthToken = null;
  currentSessionId = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_session_id');
  localStorage.removeItem('auth_user');
}

// ─── Gentle Eviction Event Dispatcher ────────────────────────────────────────

type EvictionListener = (detail?: { message?: string; replacedBySessionId?: string }) => void;
const evictionListeners: EvictionListener[] = [];

export function onSessionEvicted(listener: EvictionListener): () => void {
  evictionListeners.push(listener);
  return () => {
    const idx = evictionListeners.indexOf(listener);
    if (idx !== -1) evictionListeners.splice(idx, 1);
  };
}

export function triggerSessionEviction(detail?: { message?: string; replacedBySessionId?: string }): void {
  evictionListeners.forEach((fn) => fn(detail));
}

// ─── Core API Request Wrapper ────────────────────────────────────────────────

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 && payload?.code === 'SESSION_REVOKED') {
      triggerSessionEviction({ message: payload.error });
    }
    throw new ArenaApiError(response.status, extractErrorMessage(payload));
  }

  return payload as T;
}

// ─── Auth Flow API Functions (v15.0.0) ────────────────────────────────────────

export async function sendOtp(phone: string): Promise<SendOtpResponse> {
  return apiRequest<SendOtpResponse>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(
  phone: string,
  otp: string,
  displayName?: string,
): Promise<VerifyOtpResponse> {
  const result = await apiRequest<VerifyOtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp, displayName }),
  });
  if (result.success && result.token) {
    setAuthToken(result.token);
    setSessionId(result.sessionId);
  }
  return result;
}

export async function fetchCurrentUser(): Promise<{ success: boolean; user: any }> {
  return apiRequest<{ success: boolean; user: any }>('/auth/me', {
    method: 'GET',
  });
}

export async function fetchPlans(): Promise<PlansResponse> {
  return fetchSubscriptionPlans();
}

export type DebateMessageResponse = MessageResponse;

// ─── Thinking Profile & Skill Tree Domain Types (v15.0.0) ───────────────────

export interface RadarData {
  logic: number;
  structure: number;
  reflex: number;
  voice: number;
  overallScore: number;
}

export interface DataAvailability {
  logic: boolean;
  structure: boolean;
  reflex: boolean;
  voice: boolean;
}

export interface FallacyStatItem {
  name: string;
  vietnameseName: string;
  count: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  lastSeen: string;
  remediationTip: string;
}

export type Wpm5Zone = 'SLOW' | 'MODERATE_SLOW' | 'OPTIMAL' | 'MODERATE_FAST' | 'FAST';
export type Wpm3ZonePresentation = 'SLOW' | 'OPTIMAL' | 'FAST';

export interface WpmHistoryPoint {
  sessionId: string;
  date: string;
  topicTitle: string;
  avgWpm: number;
  zone: Wpm5Zone;
  paceZone: Wpm3ZonePresentation;
  fillerRate: number;
  fillerCount: number;
  pauseRatio: number;
  durationSeconds: number;
  hasVoiceTelemetry: boolean;
}

export interface VoiceMetricsSummary {
  hasVoiceTelemetry: boolean;
  averageWpm: number;
  optimalBandPercentage: number;
  totalVoiceSessions: number;
  averageFillerRate: number;
  averagePauseRatio: number;
}

export interface ConfidenceData {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  sampleCount: number;
  minForMedium: number;
  minForHigh: number;
  message: string;
}

export interface ThinkingProfileAnalyticsResponse {
  success: boolean;
  period: '7d' | '30d' | '90d' | 'all';
  confidence: ConfidenceData;
  radar: RadarData;
  dataAvailability: DataAvailability;
  topFallacies: FallacyStatItem[];
  totalFallaciesDetected: number;
  voiceMetrics: VoiceMetricsSummary;
  wpmHistory: WpmHistoryPoint[];
  totalSessionsAnalyzed: number;
  validSessionsCount: number;
}

export interface SkillLevelNode {
  level: number;
  id: string;
  title: string;
  titleEn: string;
  description: string;
  unlocked: boolean;
  isLocked: boolean;
  skillProgress: number;
  masteryProgress: number;
  unlockThreshold: number;
  isCurrentLevel: boolean;
  socraticOnly: boolean;
  pedagogyFocus: string[];
  badge: string;
  remediationRecommendations: string[];
}

export interface SkillTreeProgressResponse {
  success: boolean;
  currentLevel: number;
  unlockedCount: number;
  totalMasteryScore: number;
  levels: SkillLevelNode[];
}

/**
 * GET /api/v1/profile/analytics?period=7d|30d|90d|all
 * Fetches 4-axis Thinking Radar, Fallacies, WPM curve, and period-relative confidence.
 */
export async function fetchThinkingProfileAnalytics(
  period: '7d' | '30d' | '90d' | 'all' = 'all'
): Promise<ThinkingProfileAnalyticsResponse> {
  return apiRequest<ThinkingProfileAnalyticsResponse>(`/profile/analytics?period=${period}`, {
    method: 'GET',
  });
}

/**
 * GET /api/v1/profile/skill-tree
 * Fetches 7-Level Pedagogical Skill Tree with sequential unlock progress and L3 Socratic constraint.
 */
export async function fetchSkillTreeProgress(): Promise<SkillTreeProgressResponse> {
  return apiRequest<SkillTreeProgressResponse>('/profile/skill-tree', {
    method: 'GET',
  });
}

// ─── Voice Session & Entitlement Domain Types (Phases B3-B6 Contract Locked) ─

export type VoiceSessionStatus =
  | 'CREATED'
  | 'ACTIVE'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'ABORTED'
  | 'TIMEOUT'
  | 'FAILED';

export type VoiceEntitlementMode = 'TIME_UNLIMITED' | 'QUOTA';

export type VoiceEntitlementSource = 'VIP' | 'SUBSCRIPTION' | 'ADD_ON' | 'TRIAL' | null;

export interface VoiceEntitlementActivePack {
  packId: string;
  packCode: string;
  remainingUnits: number;
  expiresAt: string | Date;
}

export interface VoiceEntitlementActiveTrial {
  trialId: string;
  voiceMinsRemaining: number;
  expiresAt: string | Date;
}

export interface VoiceEntitlementBreakdown {
  subscriptionMinutes: number;
  addonMinutes: number;
  trialMinutes: number;
  vipPassCode: string | null;
  activePacks?: VoiceEntitlementActivePack[];
  activeTrial?: VoiceEntitlementActiveTrial | null;
}

export interface VoiceEntitlementResult {
  allowed: boolean;
  mode: VoiceEntitlementMode;
  source: VoiceEntitlementSource;
  availableMinutes: number | null;
  maxAllowedMs: number;
  breakdown?: VoiceEntitlementBreakdown;
  reason?: string;
}

export interface VoiceSessionDTO {
  id: string;
  userId: string;
  debateSessionId: string | null;
  status: VoiceSessionStatus;
  startedAt: string;
  endedAt: string | null;
  maxAllowedMs: number;
  actualDurationMs: number;
  billableMinutes: number;
  consumedSubMins: number;
  consumedAddonMins: number;
  consumptionDetails?: any;
  isFinalized: boolean;
  finalizedAt: string | null;
  createdAt: string;
}

/**
 * GET /api/v1/voice/entitlement?userId=<uuid>
 * Pure, deterministic read-only resolution of user's voice entitlement.
 */
export async function fetchVoiceEntitlement(userId?: string): Promise<{ success: boolean; entitlement: VoiceEntitlementResult }> {
  const queryParam = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return apiRequest<{ success: boolean; entitlement: VoiceEntitlementResult }>(`/voice/entitlement${queryParam}`, {
    method: 'GET',
  });
}

/**
 * POST /api/v1/voice/sessions
 * Creates a server-owned VoiceSession linked to DebateSession.
 */
export async function createVoiceSession(payload: {
  userId?: string;
  debateSessionId?: string;
}): Promise<{ success: boolean; voice_session: VoiceSessionDTO }> {
  return apiRequest<{ success: boolean; voice_session: VoiceSessionDTO }>('/voice/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/v1/voice/sessions/:id/finalize
 * Finalizes voice session with server duration authority and B4 atomic billing.
 */
export async function finalizeVoiceSession(
  id: string,
  payload: {
    userId?: string;
    actualDurationMs?: number;
    reason?: string;
  },
): Promise<{ success: boolean; already_finalized?: boolean; voice_session: VoiceSessionDTO }> {
  return apiRequest<{ success: boolean; already_finalized?: boolean; voice_session: VoiceSessionDTO }>(`/voice/sessions/${id}/finalize`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/v1/voice/sessions/:id/abort
 * Aborts a voice session with zero quota deduction.
 */
export async function abortVoiceSession(
  id: string,
  payload: {
    userId?: string;
    reason?: string;
  },
): Promise<{ success: boolean; already_finalized?: boolean; voice_session: VoiceSessionDTO }> {
  return apiRequest<{ success: boolean; already_finalized?: boolean; voice_session: VoiceSessionDTO }>(`/voice/sessions/${id}/abort`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const api = {
  createDebateSession,
  sendDebateMessage,
  completeDebateSession,
  listUserSessions,
  fetchSessionDetail,
  deleteSessionApi,
  bulkDeleteSessions,
  createSpeechDraft,
  createMotionAnalysis,
  fetchPlazaFeed,
  addPlazaLike,
  removePlazaLike,
  addPlazaFavorite,
  removePlazaFavorite,
  recordPlazaView,
  togglePlazaLike,
  togglePlazaFavorite,
  fetchPlazaDetail,
  fetchUserProfile,
  updateUserProfile,
  fetchSubscriptionPlans,
  createCheckoutSession,
  sandboxDirectUpgrade,
  notifyPaymentWebhook,
  redeemTeamInvite,
  fetchMyTeams,
  sendOtp,
  verifyOtp,
  fetchDebateHistory,
  fetchDebateReplay,
  fetchCurrentUser,
  fetchPlans,
  fetchThinkingProfileAnalytics,
  fetchSkillTreeProgress,
  fetchVoiceEntitlement,
  createVoiceSession,
  finalizeVoiceSession,
  abortVoiceSession,
  fetchUserOrders,
};





