import { getModelPricing, ModelPricing } from './pricingRegistry';

export interface CostResult {
  estimatedCostUsd: number | null;
  pricingVersion: string | null;
  pricingSource: string | null;
}

/**
 * Historical estimated cost formula:
 *   (input_tokens / 1_000_000 * inputPerM) + (output_tokens / 1_000_000 * outputPerM)
 *
 * This is estimated telemetry only, never a billing-authoritative value.
 */
export function computeCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing,
): number {
  const safeInput = Number.isFinite(inputTokens) && inputTokens > 0 ? inputTokens : 0;
  const safeOutput = Number.isFinite(outputTokens) && outputTokens > 0 ? outputTokens : 0;
  return (
    (safeInput / 1_000_000) * pricing.inputPerM +
    (safeOutput / 1_000_000) * pricing.outputPerM
  );
}

/**
 * Returns null pricing fields for unknown/unverified models without throwing.
 */
export function calculateEstimatedCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number,
): CostResult {
  const pricing = getModelPricing(modelName);
  if (!pricing) {
    // SPEC GAP: missing or unverified pricing -> null, never 0.
    return { estimatedCostUsd: null, pricingVersion: null, pricingSource: null };
  }

  return {
    estimatedCostUsd: computeCost(inputTokens, outputTokens, pricing),
    pricingVersion: pricing.pricingVersion,
    pricingSource: pricing.pricingSource,
  };
}
