/**
 * Verified AI model pricing registry.
 *
 * Pricing rates are NEVER invented. Only models with an authoritative,
 * explicitly-sourced per-million-token price belong in this registry.
 *
 * SPEC GAP: docs/15_COST_METERING_SPEC.md does not provide per-million-token
 * rates for any active model (notably `claude-sonnet-5` and
 * `gemini-flash-latest`). The registry is therefore intentionally empty, and
 * `estimated_cost_usd` stays `null` for those models (never `0`).
 *
 * To add a rate, populate `REGISTRY` with an entry carrying a concrete
 * `pricingVersion` and `pricingSource` from an authoritative reference.
 */

export interface ModelPricing {
  /** USD cost per 1,000,000 input tokens. */
  inputPerM: number;
  /** USD cost per 1,000,000 output tokens. */
  outputPerM: number;
  pricingVersion: string;
  pricingSource: string;
}

const REGISTRY: Record<string, ModelPricing> = {};

export function getModelPricing(modelName: string): ModelPricing | null {
  const key = modelName.trim().toLowerCase();
  return REGISTRY[key] ?? null;
}
