/**
 * DebateReplay — Debate Replay Engine Component (09_REPLAY_SPEC.md Compliance)
 *
 * Implements the 4-layer synchronized Replay Engine:
 *   - Layer 1: Audio / Voice Telemetry (WPM, duration, filler words, audio playback)
 *   - Layer 2: Synchronized Transcript stream (User vs AI Opponent dialogue)
 *   - Layer 3: Interactive Timeline navigation (Segmented turn nodes, Prev/Next controls)
 *   - Layer 4: AI Analysis JSON (Static read-only Logic Coach & Voice Coach telemetry)
 *
 * STRICT NO-LLM RULE:
 *   Zero LLM API calls, zero quota deductions. 100% static read from persisted data.
 *
 * Spec: docs/09_REPLAY_SPEC.md §4, §5, §11; Blueprint v3.0.0 Section 15
 */

import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Swords,
  AlertTriangle,
  Star,
  Mic,
  Volume2,
  VolumeX,
  Gauge,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { TranscriptTurn, SessionDetailResponse } from '../lib/api';
import { Strings, Language } from '../lib/i18n';
import { speakOpponentResponse, stopSpeaking } from '../utils/tts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedVoiceTelemetry {
  wpm?: number;
  duration_ms?: number;
  durationMs?: number;
  filler_count?: number;
  fillerCount?: number;
  filler_words?: string[];
  fillerWords?: string[];
  stt_source?: string;
  tier?: string;
}

/**
 * Full Logic Coach analysis payload extracted from the __coach__ sentinel.
 * Mirrors the CoachFeedback shape returned by the LLM and persisted by the backend.
 * Spec: 09_REPLAY_SPEC.md §5.4 — Layer 4 AI Analysis JSON.
 */
export interface ParsedCoachPayload {
  score: number | null;
  cre_analysis: {
    claim: string;
    reasoning: string;
    evidence: string;
  } | null;
  strengths: string[];
  weaknesses: string[];
  actionable_suggestions: string[];
}

export interface ReplayTurnPair {
  /** 1-based round index for display (1, 2, 3...) — replaces raw DB turn_number */
  roundNumber: number;
  /** Raw DB turn_number of the user transcript row */
  turnNumber: number;
  userTranscript: TranscriptTurn;
  aiTranscript: TranscriptTurn | null;
  fallacies: string[];
  voiceMetrics: ParsedVoiceTelemetry | null;
  /** Full Logic Coach payload extracted from __coach__ sentinel. Null for old sessions. */
  coachPayload: ParsedCoachPayload | null;
  evidenceStar: number | null;
}

interface DebateReplayProps {
  session: SessionDetailResponse['session'];
  turns: TranscriptTurn[];
  onBack: () => void;
  t: Strings;
  language: Language;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extracts clean fallacies list, voice telemetry, and full coach payload
 * from the raw `fallacies_detected` JSON field.
 *
 * Sentinel protocol (set by backend, 09_REPLAY_SPEC.md Layer 4):
 *   "__voice__{json}" — voice telemetry (WPM, duration, fillers)
 *   "__coach__{json}" — full Logic Coach payload (score, C-R-E, strengths, weaknesses)
 *   Plain strings     — detected logical fallacy descriptions
 */
function parseTurnAnalysis(raw: unknown): {
  fallacies: string[];
  voiceMetrics: ParsedVoiceTelemetry | null;
  coachPayload: ParsedCoachPayload | null;
} {
  if (!raw || !Array.isArray(raw)) {
    return { fallacies: [], voiceMetrics: null, coachPayload: null };
  }

  const fallacies: string[] = [];
  let voiceMetrics: ParsedVoiceTelemetry | null = null;
  let coachPayload: ParsedCoachPayload | null = null;

  for (const item of raw) {
    if (typeof item === 'string') {
      if (item.startsWith('__voice__')) {
        try {
          voiceMetrics = JSON.parse(item.slice('__voice__'.length)) as ParsedVoiceTelemetry;
        } catch {
          // Ignore parse errors on corrupted telemetry
        }
      } else if (item.startsWith('__coach__')) {
        try {
          coachPayload = JSON.parse(item.slice('__coach__'.length)) as ParsedCoachPayload;
        } catch {
          // Ignore parse errors on corrupted coach snapshot
        }
      } else if (item.trim()) {
        fallacies.push(item.trim());
      }
    }
  }

  return { fallacies, voiceMetrics, coachPayload };
}

/**
 * Groups raw transcripts into synchronized turn pairs (User + AI Opponent).
 *
 * KEY FIX: The backend stores user turns at odd turn_numbers (1, 3, 5...)
 * and AI turns at the immediately following turn_numbers (2, 4, 6...).
 * We match each user turn with the AI turn at `user.turn_number + 1`.
 */
function buildTurnPairs(turns: TranscriptTurn[]): ReplayTurnPair[] {
  // Sort all transcripts by turn_number ascending
  const sorted = [...turns].sort((a, b) => a.turn_number - b.turn_number);

  // Index AI turns by their own turn_number
  const aiByTurn = new Map<number, TranscriptTurn>();
  sorted.filter((t) => t.speaker_type === 'ai').forEach((t) => aiByTurn.set(t.turn_number, t));

  // All user turns in order
  const userTurns = sorted.filter((t) => t.speaker_type === 'user');

  return userTurns.map((uTurn, idx) => {
    const { fallacies, voiceMetrics, coachPayload } = parseTurnAnalysis(uTurn.fallacies_detected);

    // AI rebuttal comes right after the user turn (turn_number + 1)
    const aiTurn = aiByTurn.get(uTurn.turn_number + 1) ?? null;

    return {
      roundNumber: idx + 1,       // 1-based display number (Vòng 1, Vòng 2...)
      turnNumber: uTurn.turn_number,
      userTranscript: uTurn,
      aiTranscript: aiTurn,
      fallacies,
      voiceMetrics,
      coachPayload,
      evidenceStar: uTurn.evidence_star,
    };
  });
}


function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DebateReplay({
  session,
  turns,
  onBack,
  t,
  language,
}: DebateReplayProps) {
  const isVi = language === 'vi';
  const pairs = useMemo(() => buildTurnPairs(turns), [turns]);

  // Timeline view state
  const [activeTurnIndex, setActiveTurnIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');

  // TTS audio playback state
  const [playingTurn, setPlayingTurn] = useState<number | null>(null);

  // Safe global cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Stop speech when turn or view mode changes
  useEffect(() => {
    stopSpeaking();
    setPlayingTurn(null);
  }, [activeTurnIndex, viewMode]);

  const currentPair: ReplayTurnPair | undefined = pairs[activeTurnIndex];

  // Opponent name mapping
  const opponentName = session.character_id === 'sonTung' ? t.sonTung : t.hoaMinzy;
  const isAffirmative = session.user_side === 'AFFIRMATIVE';

  // Average Evidence Star calculation
  const stars = pairs.map((p) => p.evidenceStar).filter((s): s is number => typeof s === 'number');
  const avgStar = stars.length > 0 ? (stars.reduce((a, b) => a + b, 0) / stars.length).toFixed(1) : null;

  function handlePlayTts(text: string, turnNumber: number) {
    if (playingTurn === turnNumber) {
      stopSpeaking();
      setPlayingTurn(null);
    } else {
      stopSpeaking();
      setPlayingTurn(turnNumber);
      speakOpponentResponse(text, {
        lang: isVi ? 'vi-VN' : 'en-US',
        rate: 1.0,
        pitch: 1.0,
        onEnd: () => setPlayingTurn(null),
      });
    }
  }

  return (
    <div className="replay-container">
      {/* ── Header Bar ── */}
      <div className="replay-header">
        <button
          type="button"
          className="button button--ghost replay-header__back"
          onClick={() => {
            stopSpeaking();
            onBack();
          }}
          title={isVi ? 'Quay lại danh sách lịch sử' : 'Back to history'}
        >
          <ArrowLeft size={16} aria-hidden />
          <span>{isVi ? 'Lịch sử' : 'History'}</span>
        </button>

        <div className="replay-header__title-group">
          <div className="replay-header__badges">
            <span className={`replay-badge replay-badge--${isAffirmative ? 'aff' : 'neg'}`}>
              {isAffirmative ? t.affirmative : t.negative}
            </span>
            <span className="replay-badge replay-badge--character">
              <Swords size={12} aria-hidden />
              {opponentName}
            </span>
            <span className="replay-badge replay-badge--date">
              <Clock size={12} aria-hidden />
              {formatDate(session.created_at)}
            </span>
            {avgStar && (
              <span className="replay-badge replay-badge--star">
                <Star size={12} fill="currentColor" aria-hidden />
                {avgStar} / 5
              </span>
            )}
          </div>
          <h1 className="replay-header__topic">{session.topic}</h1>
        </div>
      </div>

      {pairs.length === 0 ? (
        <div className="empty-state">
          <MessageSquare size={32} aria-hidden />
          <p>{t.replayNoTurns}</p>
        </div>
      ) : (
        <>
          {/* ── Layer 3: Interactive Timeline Bar ── */}
          <div className="replay-timeline-card">
            <div className="replay-timeline__header">
              <div className="replay-timeline__title">
                <Activity size={16} aria-hidden />
                <span>{t.replayTimeline}</span>
                <span className="replay-timeline__count">
                  ({pairs.length} {t.historyTurns})
                </span>
              </div>

              {/* View mode segmented switch */}
              <div className="segmented segmented--sm">
                <button
                  type="button"
                  className={`segmented__option ${viewMode === 'single' ? 'segmented__option--active' : ''}`}
                  onClick={() => setViewMode('single')}
                >
                  {t.replaySingleTurn}
                </button>
                <button
                  type="button"
                  className={`segmented__option ${viewMode === 'all' ? 'segmented__option--active' : ''}`}
                  onClick={() => setViewMode('all')}
                >
                  <ListFilter size={13} aria-hidden />
                  {t.replayAllTurns}
                </button>
              </div>
            </div>

            {/* Segmented Timeline Nodes */}
            <div className="replay-timeline__nodes">
              {pairs.map((pair, idx) => {
                const isActive = viewMode === 'single' && activeTurnIndex === idx;
                const hasFallacy = pair.fallacies.length > 0;
                const hasVoice = !!pair.voiceMetrics;

                return (
                  <button
                    key={pair.roundNumber}
                    type="button"
                    className={`replay-timeline__node ${isActive ? 'replay-timeline__node--active' : ''}`}
                    onClick={() => {
                      setViewMode('single');
                      setActiveTurnIndex(idx);
                    }}
                  >
                    <div className="replay-timeline__node-turn">
                      {isVi ? 'Vòng' : 'Round'} {pair.roundNumber}
                    </div>
                    <div className="replay-timeline__node-indicators">
                      {pair.evidenceStar != null && (
                        <span className="replay-timeline__node-star" title={`Dẫn chứng: ${pair.evidenceStar} sao`}>
                          ★{pair.evidenceStar}
                        </span>
                      )}
                      {hasFallacy && (
                        <span className="replay-timeline__node-warn" title={`Phát hiện ${pair.fallacies.length} ngụy biện`}>
                          ⚠️
                        </span>
                      )}
                      {hasVoice && (
                        <span className="replay-timeline__node-mic" title="Có dữ liệu giọng nói">
                          🎙️
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main Replay Stream ── */}
          {viewMode === 'single' && currentPair ? (
            <div className="replay-content">
              {/* Stepper Navigation */}
              <div className="replay-stepper">
                <button
                  type="button"
                  className="button button--ghost button--sm"
                  disabled={activeTurnIndex === 0}
                  onClick={() => setActiveTurnIndex((prev) => Math.max(0, prev - 1))}
                >
                  <ChevronLeft size={16} aria-hidden />
                  {t.replayPrevTurn}
                </button>
                <span className="replay-stepper__status">
                  {isVi ? 'Vòng' : 'Round'} <strong>{currentPair.roundNumber}</strong> / {pairs.length}
                </span>
                <button
                  type="button"
                  className="button button--ghost button--sm"
                  disabled={activeTurnIndex === pairs.length - 1}
                  onClick={() => setActiveTurnIndex((prev) => Math.min(pairs.length - 1, prev + 1))}
                >
                  {t.replayNextTurn}
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>

              {/* Synchronized Turn Pair Card */}
              <TurnPairInspection
                pair={currentPair}
                opponentName={opponentName}
                isPlaying={playingTurn === currentPair.roundNumber}
                onTogglePlayTts={() => currentPair.aiTranscript && handlePlayTts(currentPair.aiTranscript.text_content, currentPair.roundNumber)}
                t={t}
                isVi={isVi}
              />
            </div>
          ) : (
            /* All Turns Continuous Stream */
            <div className="replay-all-stream">
              {pairs.map((pair) => (
                <div key={pair.roundNumber} className="replay-all-stream__item">
                  <div className="replay-all-stream__turn-header">
                    <span className="replay-badge replay-badge--character">
                      {isVi ? 'Vòng' : 'Round'} {pair.roundNumber}
                    </span>
                  </div>
                  <TurnPairInspection
                    pair={pair}
                    opponentName={opponentName}
                    isPlaying={playingTurn === pair.roundNumber}
                    onTogglePlayTts={() => pair.aiTranscript && handlePlayTts(pair.aiTranscript.text_content, pair.roundNumber)}
                    t={t}
                    isVi={isVi}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-Component: TurnPairInspection ────────────────────────────────────────

interface TurnPairInspectionProps {
  pair: ReplayTurnPair;
  opponentName: string;
  isPlaying: boolean;
  onTogglePlayTts: () => void;
  t: Strings;
  isVi: boolean;
}

function TurnPairInspection({
  pair,
  opponentName,
  isPlaying,
  onTogglePlayTts,
  t,
  isVi,
}: TurnPairInspectionProps) {
  const { userTranscript, aiTranscript, fallacies, voiceMetrics, evidenceStar } = pair;

  // Voice telemetry derived values
  const wpm = voiceMetrics?.wpm;
  const durationSec = voiceMetrics?.duration_ms
    ? (voiceMetrics.duration_ms / 1000).toFixed(1)
    : voiceMetrics?.durationMs
    ? (voiceMetrics.durationMs / 1000).toFixed(1)
    : null;
  const fillerCount = voiceMetrics?.filler_count ?? voiceMetrics?.fillerCount ?? 0;

  // Evidence quality label (1–5 stars)
  function evidenceLabel(star: number): string {
    if (star >= 4) return isVi ? '✅ Dẫn chứng tốt' : '✅ Strong evidence';
    if (star === 3) return isVi ? '⚠️ Cần cải thiện dẫn chứng' : '⚠️ Evidence needs improvement';
    return isVi ? '❌ Dẫn chứng yếu' : '❌ Weak evidence';
  }

  // WPM tier label
  function wpmLabel(speed: number): string {
    if (speed >= 120 && speed <= 165) return t.replayWpmNormal;
    return speed > 165 ? t.replayWpmFast : t.replayWpmSlow;
  }

  return (
    <div className="replay-turn-card">

      {/* ── Layer 2: Synchronized Transcript (User ↔ AI) ── */}
      <div className="replay-dialogue">

        {/* ── User Argument Bubble ── */}
        <div className="replay-bubble replay-bubble--user">
          <div className="replay-bubble__header">
            <span className="replay-bubble__speaker">
              <User size={14} aria-hidden />
              <strong>{t.historyDetailYou ?? t.you}</strong>
              <span className="replay-bubble__round-tag">
                {isVi ? `Vòng ${pair.roundNumber}` : `Round ${pair.roundNumber}`}
              </span>
            </span>
            {evidenceStar != null && (
              <span className="replay-bubble__star-tag" title={`${evidenceLabel(evidenceStar)} (${evidenceStar}/5)`}>
                {'★'.repeat(evidenceStar)}{'☆'.repeat(Math.max(0, 5 - evidenceStar))}
              </span>
            )}
          </div>
          <p className="replay-bubble__text">{userTranscript.text_content}</p>

          {/* Layer 4 — Fallacy alerts inline with user bubble */}
          {fallacies.length > 0 && (
            <div className="replay-fallacies-alert">
              <div className="replay-fallacies-alert__title">
                <AlertTriangle size={14} aria-hidden />
                <strong>{t.replayFallaciesDetected}:</strong>
              </div>
              <ul className="replay-fallacies-alert__list">
                {fallacies.map((f, i) => (
                  <li key={i} className="replay-fallacy-tag">{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── AI Opponent Rebuttal Bubble ── */}
        {aiTranscript ? (
          <div className="replay-bubble replay-bubble--ai">
            <div className="replay-bubble__header">
              <span className="replay-bubble__speaker">
                <Swords size={14} aria-hidden />
                <strong>{opponentName}</strong>
                <span className="replay-bubble__round-tag replay-bubble__round-tag--ai">
                  {isVi ? 'Phản biện' : 'Rebuttal'}
                </span>
              </span>
              {/* TTS playback button for opponent speech */}
              <button
                type="button"
                className={`button button--ghost replay-tts-btn ${isPlaying ? 'replay-tts-btn--active' : ''}`}
                onClick={onTogglePlayTts}
                title={isPlaying ? (isVi ? 'Dừng phát' : 'Stop') : t.replayListenOpponent}
              >
                {isPlaying ? <VolumeX size={14} aria-hidden /> : <Volume2 size={14} aria-hidden />}
                <span>{isPlaying ? (isVi ? 'Đang đọc...' : 'Speaking...') : t.replayListenOpponent}</span>
              </button>
            </div>
            <p className="replay-bubble__text">{aiTranscript.text_content}</p>
          </div>
        ) : (
          /* Placeholder when AI response wasn't saved */
          <div className="replay-bubble replay-bubble--ai replay-bubble--missing">
            <span className="replay-text-muted">
              {isVi ? '— Lời phản biện của AI chưa được lưu —' : '— AI rebuttal not recorded —'}
            </span>
          </div>
        )}
      </div>

      {/* ── Layer 4 + Layer 1: Analysis Cards ── */}
      <div className="replay-analysis-grid">

        {/* ── Logic Coach Evaluation Card — Full C-R-E Breakdown ── */}
        <div className="replay-analysis-card replay-analysis-card--logic">
          <div className="replay-analysis-card__header">
            <Sparkles size={16} className="replay-icon--logic" aria-hidden />
            <h3>{t.replayLogicTitle}</h3>
            {/* Score badge: from __coach__ payload (new sessions) or evidence_star (fallback) */}
            {pair.coachPayload?.score != null ? (
              <span className="replay-coach-score-badge replay-coach-score-badge--score">
                <Star size={12} fill="currentColor" aria-hidden />
                {isVi ? 'Điểm tổng' : 'Score'}: {pair.coachPayload.score.toFixed(1)} / 10
              </span>
            ) : evidenceStar != null ? (
              <span className="replay-coach-score-badge">
                <Star size={12} fill="currentColor" aria-hidden />
                {evidenceStar} / 5
              </span>
            ) : null}
          </div>

          <div className="replay-analysis-card__body">

            {pair.coachPayload ? (
              <>
                {/* ── 3-Column C-R-E Grid ── */}
                {pair.coachPayload.cre_analysis && (
                  <div className="replay-cre-section">
                    <div className="replay-cre-header">
                      <span className="replay-cre-label">{isVi ? 'Phân tích C-R-E' : 'C-R-E Analysis'}</span>
                    </div>
                    <div className="replay-cre-grid">
                      {/* Claim */}
                      <div className="replay-cre-col">
                        <div className="replay-cre-col__title">
                          <span className="replay-cre-col__badge replay-cre-col__badge--claim">C</span>
                          {t.claim}
                        </div>
                        <p className="replay-cre-col__text">
                          {pair.coachPayload.cre_analysis.claim || <span className="replay-text-muted">{t.notAvailable}</span>}
                        </p>
                      </div>
                      {/* Reasoning */}
                      <div className="replay-cre-col">
                        <div className="replay-cre-col__title">
                          <span className="replay-cre-col__badge replay-cre-col__badge--reasoning">R</span>
                          {t.reasoning}
                        </div>
                        <p className="replay-cre-col__text">
                          {pair.coachPayload.cre_analysis.reasoning || <span className="replay-text-muted">{t.notAvailable}</span>}
                        </p>
                      </div>
                      {/* Evidence */}
                      <div className="replay-cre-col">
                        <div className="replay-cre-col__title">
                          <span className="replay-cre-col__badge replay-cre-col__badge--evidence">E</span>
                          {t.evidence}
                          {evidenceStar != null && (
                            <span className="replay-cre-col__star">
                              {'★'.repeat(evidenceStar)}{'☆'.repeat(Math.max(0, 5 - evidenceStar))}
                            </span>
                          )}
                        </div>
                        <p className="replay-cre-col__text">
                          {pair.coachPayload.cre_analysis.evidence || <span className="replay-text-muted">{t.notAvailable}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Fallacies ── */}
                {fallacies.length > 0 && (
                  <div className="replay-cre-section">
                    <div className="replay-cre-header">
                      <span className="replay-cre-label">{t.fallacies}</span>
                      <span className="replay-coach-count-badge replay-coach-count-badge--warn">{fallacies.length}</span>
                    </div>
                    <ul className="replay-coach-list replay-coach-list--fallacy">
                      {fallacies.map((f, i) => (
                        <li key={i} className="replay-coach-list__item replay-coach-list__item--fallacy">
                          <AlertTriangle size={12} aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── Strengths ── */}
                {pair.coachPayload.strengths.length > 0 && (
                  <div className="replay-cre-section">
                    <div className="replay-cre-header">
                      <span className="replay-cre-label replay-cre-label--strength">
                        ✅ {t.strengths}
                      </span>
                    </div>
                    <ul className="replay-coach-list replay-coach-list--strength">
                      {pair.coachPayload.strengths.map((s, i) => (
                        <li key={i} className="replay-coach-list__item replay-coach-list__item--strength">
                          <CheckCircle2 size={12} aria-hidden />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── Weaknesses ── */}
                {pair.coachPayload.weaknesses.length > 0 && (
                  <div className="replay-cre-section">
                    <div className="replay-cre-header">
                      <span className="replay-cre-label replay-cre-label--weakness">
                        ⚠️ {t.weaknesses}
                      </span>
                    </div>
                    <ul className="replay-coach-list replay-coach-list--weakness">
                      {pair.coachPayload.weaknesses.map((w, i) => (
                        <li key={i} className="replay-coach-list__item replay-coach-list__item--weakness">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── Actionable Suggestions ── */}
                {pair.coachPayload.actionable_suggestions.length > 0 && (
                  <div className="replay-cre-section">
                    <div className="replay-cre-header">
                      <span className="replay-cre-label replay-cre-label--suggestion">
                        💡 {t.suggestions}
                      </span>
                    </div>
                    <ul className="replay-coach-list replay-coach-list--suggestion">
                      {pair.coachPayload.actionable_suggestions.map((s, i) => (
                        <li key={i} className="replay-coach-list__item replay-coach-list__item--suggestion">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* No fallacies confirmation */}
                {fallacies.length === 0 && (
                  <div className="replay-cre-section">
                    <span className="replay-text-success">
                      <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }} aria-hidden />
                      {t.replayNoFallacies}
                    </span>
                  </div>
                )}
              </>
            ) : (
              /* Fallback for old sessions that predate the __coach__ sentinel */
              <>
                {/* Evidence star quality — from DB column */}
                <div className="replay-cre-section">
                  <div className="replay-cre-header">
                    <span className="replay-cre-label">{t.replayEvidenceRating}</span>
                  </div>
                  <div className="replay-cre-body">
                    {evidenceStar != null ? (
                      <div className="replay-evidence-row">
                        <span className="replay-star-icons">
                          {'★'.repeat(evidenceStar)}{'☆'.repeat(Math.max(0, 5 - evidenceStar))}
                        </span>
                        <span className="replay-star-score">({evidenceStar}/5)</span>
                      </div>
                    ) : (
                      <span className="replay-text-muted">{t.notAvailable}</span>
                    )}
                  </div>
                </div>

                {/* Fallacy status */}
                <div className="replay-cre-section">
                  <div className="replay-cre-header">
                    <span className="replay-cre-label">{t.fallacies}</span>
                    {fallacies.length > 0 ? (
                      <span className="replay-coach-count-badge replay-coach-count-badge--warn">{fallacies.length}</span>
                    ) : (
                      <span className="replay-coach-count-badge replay-coach-count-badge--ok">0</span>
                    )}
                  </div>
                  <div className="replay-cre-body">
                    {fallacies.length > 0 ? (
                      <ul className="replay-coach-list replay-coach-list--fallacy">
                        {fallacies.map((f, i) => (
                          <li key={i} className="replay-coach-list__item replay-coach-list__item--fallacy">
                            <AlertTriangle size={12} aria-hidden />
                            {f}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="replay-text-success">
                        <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }} aria-hidden />
                        {t.replayNoFallacies}
                      </span>
                    )}
                  </div>
                </div>

                {/* Note for sessions before coach persistence */}
                <div className="replay-coach-note replay-coach-note--legacy">
                  <span className="replay-coach-note__icon">📝</span>
                  <span className="replay-coach-note__text">
                    {isVi
                      ? 'Phiên tranh biện này được tạo trước khi hệ thống lưu chi tiết C-R-E. Các phiên mới sẽ hiển thị đầy đủ Luận điểm, Lập luận, Dẫn chứng, Điểm mạnh và Điểm cần cải thiện.'
                      : 'This session was created before C-R-E details were persisted. New sessions will display the full Claim, Reasoning, Evidence, Strengths, and Weaknesses breakdown.'}
                  </span>
                </div>
              </>
            )}

          </div>
        </div>

        {/* ── Voice Coach Telemetry Card (Layer 1 — only when voice metrics exist) ── */}
        {voiceMetrics && (
          <div className="replay-analysis-card replay-analysis-card--voice">
            <div className="replay-analysis-card__header">
              <Mic size={16} className="replay-icon--voice" aria-hidden />
              <h3>{t.replayVoiceTitle}</h3>
            </div>

            <div className="replay-analysis-card__body">
              {/* WPM Speed */}
              {typeof wpm === 'number' && (
                <div className="replay-meter-row">
                  <span className="replay-meter-label">{t.replayWpm}:</span>
                  <div className="replay-wpm-badge">
                    <Gauge size={14} aria-hidden />
                    <strong>{Math.round(wpm)} WPM</strong>
                    <span className={`replay-wpm-eval ${wpm >= 120 && wpm <= 165 ? 'replay-text-success' : 'replay-text-warning'}`}>
                      {wpmLabel(wpm)}
                    </span>
                  </div>
                </div>
              )}

              {/* Duration */}
              {durationSec && (
                <div className="replay-meter-row">
                  <span className="replay-meter-label">{t.replayDuration}:</span>
                  <span className="replay-stat-value">{durationSec}s</span>
                </div>
              )}

              {/* Filler Words */}
              <div className="replay-meter-row">
                <span className="replay-meter-label">{t.replayFillers}:</span>
                <span className={`replay-stat-value ${fillerCount > 3 ? 'replay-text-danger' : 'replay-text-success'}`}>
                  {fillerCount} {isVi ? 'từ đệm' : 'filler words'}
                  {fillerCount > 3 && <span> ⚠️</span>}
                </span>
              </div>

              {/* STT Source badge */}
              {voiceMetrics.stt_source && (
                <div className="replay-meter-row">
                  <span className="replay-meter-label">STT:</span>
                  <span className="replay-stat-value replay-text-muted">{voiceMetrics.stt_source}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

