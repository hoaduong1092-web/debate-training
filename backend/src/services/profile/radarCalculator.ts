/**
 * Thinking Radar Engine (v15.0.0)
 *
 * Source of Truth: 07_SCORING_SPEC.md, 08_VOICE_ENGINE_SPEC.md & Blueprint V15.0
 * Pure deterministic mathematics — zero LLM calls.
 * Implements 4-axis calculation (Logic, Structure, Reflex, Voice) with exact
 * locked weights, unique fallacy penalty clamping, and overallScore derivation.
 */

import { calculatePauseStabilityScore } from './voiceTelemetry';

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

export interface RadarAnalyticsResult {
  radar: RadarData;
  dataAvailability: DataAvailability;
}

export interface CoachSnapshot {
  score?: number | null;
  cre_analysis?: {
    claim?: string;
    reasoning?: string;
    evidence?: string;
  } | null;
  strengths?: string[];
  weaknesses?: string[];
  actionable_suggestions?: string[];
}

export interface ExtractedTurnData {
  claimPresent: boolean;
  reasoningPresent: boolean;
  evidencePresent: boolean;
  evidenceStar: number;
  coachScore: number | null;
  isRebuttal: boolean;
}

export function extractCoachSnapshot(fallaciesDetected: unknown): CoachSnapshot | null {
  if (!fallaciesDetected || !Array.isArray(fallaciesDetected)) return null;

  for (const item of fallaciesDetected) {
    if (typeof item === 'string' && item.startsWith('__coach__')) {
      try {
        return JSON.parse(item.slice(9)) as CoachSnapshot;
      } catch {}
    }
  }
  return null;
}

/**
 * Extracts per-turn structured data for deterministic metric derivation.
 */
export function extractTurnData(transcript: {
  fallaciesDetected?: unknown;
  evidenceStar?: number | null;
  textContent?: string;
}): ExtractedTurnData {
  const coach = extractCoachSnapshot(transcript.fallaciesDetected);
  const text = transcript.textContent || '';
  const cre = coach?.cre_analysis;

  const claimPresent = Boolean(cre?.claim && cre.claim.trim().length > 0) || text.length > 10;
  const reasoningPresent = Boolean(cre?.reasoning && cre.reasoning.trim().length > 0) || text.length > 25;
  const evidencePresent = Boolean(cre?.evidence && cre.evidence.trim().length > 0) || (transcript.evidenceStar ? transcript.evidenceStar > 1 : false);
  const evidenceStar = transcript.evidenceStar && transcript.evidenceStar >= 1 ? Math.min(5, transcript.evidenceStar) : 1;
  const coachScore = typeof coach?.score === 'number' ? coach.score : null;

  // Rebuttal marker: presence of weaknesses addressed, actionable suggestions or refutation words
  const isRebuttal = Boolean(
    (coach?.weaknesses && coach.weaknesses.length > 0) ||
    /tuy nhiên|ngược lại|bác bỏ|phản biện|không đồng ý|trái lại|thực tế là|tuy vậy|nhưng/i.test(text)
  );

  return {
    claimPresent,
    reasoningPresent,
    evidencePresent,
    evidenceStar,
    coachScore,
    isRebuttal,
  };
}

/**
 * Helper to clamp a number strictly within [min, max] and round to 1 decimal place.
 */
export function clamp(min: number, max: number, value: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  return +(clamped.toFixed(1));
}

/**
 * 1. Logic Score Formula (Section 2-A.1):
 * Logic = clamp(0, 100, 0.40 * contentScore + 0.30 * premiseCoherence + 0.30 * coachScore - fallacyPenalty)
 * fallacyPenalty = min(15, uniqueFallacyTypes * 2)
 */
export function calculateLogicScore(
  contentScore: number,
  premiseCoherence: number,
  coachScore: number,
  uniqueFallacyTypes: number
): number {
  const fallacyPenalty = Math.min(15, Math.max(0, uniqueFallacyTypes * 2));
  const raw = 0.40 * contentScore + 0.30 * premiseCoherence + 0.30 * coachScore - fallacyPenalty;
  return clamp(0, 100, raw);
}

/**
 * 2. Structure Score Formula (Section 2-A.2):
 * Structure = clamp(0, 100, 0.35 * claimPresence + 0.35 * reasoningPresence + 0.20 * evidencePresence + 0.10 * evidenceQuality)
 */
export function calculateStructureScore(
  claimPresence: number,
  reasoningPresence: number,
  evidencePresence: number,
  evidenceQuality: number
): number {
  const raw = 0.35 * claimPresence + 0.35 * reasoningPresence + 0.20 * evidencePresence + 0.10 * evidenceQuality;
  return clamp(0, 100, raw);
}

/**
 * 3. Reflex Score Formula (Section 2-A.3):
 * Reflex = clamp(0, 100, 0.40 * strategyScore + 0.35 * rebuttalDepth + 0.25 * poiEngagement)
 */
export function calculateReflexScore(
  strategyScore: number,
  rebuttalDepth: number,
  poiEngagement: number
): number {
  const raw = 0.40 * strategyScore + 0.35 * rebuttalDepth + 0.25 * poiEngagement;
  return clamp(0, 100, raw);
}

/**
 * 4. Voice Score Formula (Section 2-A.4):
 * When DSP is present:
 * Voice = clamp(0, 100, 0.35 * styleScore + 0.35 * wpmOptimalScore + 0.20 * fillerControlScore + 0.10 * pauseStabilityScore)
 * When DSP is absent:
 * Voice = styleScore
 */
export function calculateVoiceScore(
  styleScore: number,
  wpmOptimalScore: number,
  fillerControlScore: number,
  pauseStabilityScore: number,
  hasVoiceTelemetry: boolean
): number {
  if (!hasVoiceTelemetry) {
    return clamp(0, 100, styleScore);
  }
  const raw = 0.35 * styleScore + 0.35 * wpmOptimalScore + 0.20 * fillerControlScore + 0.10 * pauseStabilityScore;
  return clamp(0, 100, raw);
}

export interface UserSessionData {
  id: string;
  scoreTotal?: any;
  transcripts?: Array<{
    speakerType: string;
    fallaciesDetected?: unknown;
    evidenceStar?: number | null;
    textContent?: string;
  }>;
}

/**
 * Evaluates the full Thinking Radar across a user's session dataset.
 */
export function evaluateThinkingRadar(
  sessions: UserSessionData[],
  uniqueFallacyTypesCount: number,
  voiceAnalytics: {
    hasVoiceTelemetry: boolean;
    averageWpm: number;
    averageFillerRate: number;
    averagePauseRatio: number;
  }
): RadarAnalyticsResult {
  if (!sessions || sessions.length === 0) {
    return {
      radar: {
        logic: 50.0,
        structure: 50.0,
        reflex: 50.0,
        voice: 50.0,
        overallScore: 50.0,
      },
      dataAvailability: {
        logic: false,
        structure: false,
        reflex: false,
        voice: false,
      },
    };
  }

  // 1. Collect turn metrics
  const userTurns: ExtractedTurnData[] = [];
  const sessionScores: number[] = [];

  for (const s of sessions) {
    const scoreVal = Number(s.scoreTotal);
    if (!isNaN(scoreVal) && scoreVal > 0) {
      sessionScores.push(Math.min(100, scoreVal <= 10 ? scoreVal * 10 : scoreVal));
    }
    const uTranscripts = (s.transcripts || []).filter(t => t.speakerType === 'user');
    for (const ut of uTranscripts) {
      userTurns.push(extractTurnData(ut));
    }
  }

  const hasTurns = userTurns.length > 0;
  const avgSessionScore = sessionScores.length > 0
    ? sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length
    : 75.0;

  // Logic inputs
  const contentScore = avgSessionScore;
  const validPremises = userTurns.filter(t => t.reasoningPresent).length;
  const premiseCoherence = hasTurns ? (validPremises / userTurns.length) * 100 : 50.0;
  const coachScores = userTurns.map(t => t.coachScore).filter((s): s is number => s !== null && s > 0);
  const avgCoachScore = coachScores.length > 0
    ? (coachScores.reduce((a, b) => a + b, 0) / coachScores.length) * 10
    : avgSessionScore;

  const logic = calculateLogicScore(contentScore, premiseCoherence, avgCoachScore, uniqueFallacyTypesCount);

  // Structure inputs
  const claimPresence = hasTurns ? (userTurns.filter(t => t.claimPresent).length / userTurns.length) * 100 : 50.0;
  const reasoningPresence = hasTurns ? (userTurns.filter(t => t.reasoningPresent).length / userTurns.length) * 100 : 50.0;
  const evidencePresence = hasTurns ? (userTurns.filter(t => t.evidencePresent).length / userTurns.length) * 100 : 50.0;
  const avgStars = hasTurns ? userTurns.reduce((acc, curr) => acc + curr.evidenceStar, 0) / userTurns.length : 2.5;
  const evidenceQuality = avgStars * 20;

  const structure = calculateStructureScore(claimPresence, reasoningPresence, evidencePresence, evidenceQuality);

  // Reflex inputs
  const strategyScore = avgSessionScore;
  const rebuttalDepth = hasTurns ? (userTurns.filter(t => t.isRebuttal).length / userTurns.length) * 100 : 50.0;
  const poiEngagement = avgSessionScore; // Default adherence to session performance when no direct POI fault

  const reflex = calculateReflexScore(strategyScore, rebuttalDepth, poiEngagement);

  // Voice inputs
  const styleScore = avgSessionScore;
  let wpmOptimalScore = 50;
  const wpm = voiceAnalytics.averageWpm;
  if (wpm >= 120 && wpm <= 150) {
    wpmOptimalScore = 100;
  } else if ((wpm >= 100 && wpm < 120) || (wpm > 150 && wpm <= 170)) {
    wpmOptimalScore = 80;
  } else {
    wpmOptimalScore = 50;
  }

  const fillerControlScore = clamp(0, 100, 100 - voiceAnalytics.averageFillerRate * 10);
  const pauseStabilityScore = calculatePauseStabilityScore(voiceAnalytics.averagePauseRatio);

  const voice = calculateVoiceScore(
    styleScore,
    wpmOptimalScore,
    fillerControlScore,
    pauseStabilityScore,
    voiceAnalytics.hasVoiceTelemetry
  );

  // Overall Score (Section 2-A.5): (L + S + R + V) / 4
  const overallScore = clamp(0, 100, (logic + structure + reflex + voice) / 4);

  return {
    radar: {
      logic,
      structure,
      reflex,
      voice,
      overallScore,
    },
    dataAvailability: {
      logic: hasTurns,
      structure: hasTurns,
      reflex: hasTurns,
      voice: voiceAnalytics.hasVoiceTelemetry,
    },
  };
}
