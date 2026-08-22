/**
 * Skill Level Scorers (v15.0.0)
 *
 * Source of Truth: 06_SKILL_TREE_SPEC.md & Blueprint V15.0
 * Pure deterministic mathematics — zero LLM calls.
 * Implements dedicated domain-specific scoring contracts for Levels 1 through 7.
 */

import { clamp } from './radarCalculator';

/**
 * Level 1: Xây Dựng Lập Luận (C-R-E Foundation)
 * Focus: Completeness of Claim, Reasoning, and Evidence Quality.
 * Formula: clamp(0, 100, 0.35 * claim + 0.35 * reasoning + 0.30 * evidenceQuality)
 */
export function calculateL1Progress(claimPresence: number, reasoningPresence: number, evidenceQuality: number): number {
  const raw = 0.35 * claimPresence + 0.35 * reasoningPresence + 0.30 * evidenceQuality;
  return clamp(0, 100, raw);
}

/**
 * Level 2: Tiền Đề & Logic Nhân Quả (Premises & Causal Logic)
 * Focus: Premise coherence and content argument validity.
 * Formula: clamp(0, 100, 0.50 * premiseCoherence + 0.50 * contentScore)
 */
export function calculateL2Progress(premiseCoherence: number, contentScore: number): number {
  const raw = 0.50 * premiseCoherence + 0.50 * contentScore;
  return clamp(0, 100, raw);
}

/**
 * Level 3: Phát Hiện & Hóa Giải Ngụy Biện (Fallacy Challenge)
 * Focus: Absence of logical fallacies and high coach argument evaluation.
 * Domain constraint: socratic_only = true
 * Formula: clamp(0, 100, 100 - (uniqueFallacies * 10) + 0.20 * coachScore)
 */
export function calculateL3Progress(uniqueFallaciesCount: number, coachScore: number): number {
  const raw = 100 - (uniqueFallaciesCount * 10) + 0.20 * coachScore;
  return clamp(0, 100, raw);
}

/**
 * Level 4: Phản Biện Đa Chiều & So Sánh Tác Động (Multi-dimensional Rebuttal)
 * Focus: Rebuttal depth, impact comparison, and strategy execution.
 * Formula: clamp(0, 100, 0.60 * rebuttalDepth + 0.40 * strategyScore)
 */
export function calculateL4Progress(rebuttalDepth: number, strategyScore: number): number {
  const raw = 0.60 * rebuttalDepth + 0.40 * strategyScore;
  return clamp(0, 100, raw);
}

/**
 * Level 5: Ứng Khẩu & Kiểm Soát POI 15 Giây (POI 15s Floor & Impromptu)
 * Focus: POI floor adherence, rapid rebuttal speed, and reflex score.
 * Formula: clamp(0, 100, 0.50 * poiEngagement + 0.50 * reflexScore)
 */
export function calculateL5Progress(poiEngagement: number, reflexScore: number): number {
  const raw = 0.50 * poiEngagement + 0.50 * reflexScore;
  return clamp(0, 100, raw);
}

/**
 * Level 6: Khung Thể Thức Quốc Tế (WSDC / AP / BP Parliamentary Standards)
 * Focus: Multi-speaker structure, strategy, and parliamentary rule adherence.
 * Formula: clamp(0, 100, 0.40 * structureScore + 0.30 * strategyScore + 0.30 * ruleAdherence)
 */
export function calculateL6Progress(structureScore: number, strategyScore: number, ruleAdherence: number): number {
  const raw = 0.40 * structureScore + 0.30 * strategyScore + 0.30 * ruleAdherence;
  return clamp(0, 100, raw);
}

/**
 * Level 7: Đổi Phe Thực Chiến & Tổng Kết Bàn Đấu (Switch-side Debate & Meta-strategy)
 * Focus: Holistic synthesis across all 4 cognitive radar dimensions.
 * Formula: clamp(0, 100, 0.30 * logic + 0.30 * structure + 0.20 * reflex + 0.20 * voice)
 */
export function calculateL7Progress(logic: number, structure: number, reflex: number, voice: number): number {
  const raw = 0.30 * logic + 0.30 * structure + 0.20 * reflex + 0.20 * voice;
  return clamp(0, 100, raw);
}
