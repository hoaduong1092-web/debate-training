/**
 * AI Gateway — Telemetry Metering Wrapper
 *
 * Wraps any AI provider call with latency & token metrics.
 *
 * When the active provider is Beeknoee (Antigravity), telemetry is stamped
 * with pricing_version: "v1-beeknoee" / pricing_source: "beeknoee-gateway".
 * For other providers the existing costCalculator lookup is used.
 */

import { calculateEstimatedCost } from './costCalculator';
import { getGatewayName } from './openAICompatibleClient';

export interface AICallParams {
  userId: string;
  sessionId: string;
  serviceType: string;
  modelName: string;
  taskName: string;
  apiCallFunction: () => Promise<any>;
}

export async function executeWithMetering(params: AICallParams) {
  const startTime = Date.now();
  let response: any;
  let inputTokens = 0;
  let outputTokens = 0;
  let succeeded = false;
  let executionMs = 0;

  try {
    response = await params.apiCallFunction();

    if (response?.usage) {
      inputTokens = response.usage.prompt_tokens || response.usage.inputTokens || 0;
      outputTokens = response.usage.completion_tokens || response.usage.outputTokens || 0;
    }
    succeeded = true;
  } catch (error) {
    throw error;
  } finally {
    executionMs = Date.now() - startTime;

    let pricingVersion: string | null = null;
    let pricingSource: string | null = null;
    let estimatedCostUsd: number | null = null;

    if (succeeded) {
      // Detect which gateway served this request.
      const gateway = response?._gateway ?? getGatewayName();

      if (gateway === 'beeknoee') {
        pricingVersion = 'v1-antigravity';
        pricingSource = 'beeknoee-gateway';
      } else {
        const cost = calculateEstimatedCost(params.modelName, inputTokens, outputTokens);
        pricingVersion = cost.pricingVersion;
        pricingSource = cost.pricingSource;
        estimatedCostUsd = cost.estimatedCostUsd;
      }

      console.log(`[Telemetry] task=${params.taskName} model=${params.modelName} inTokens=${inputTokens} outTokens=${outputTokens} costUsd=${estimatedCostUsd} ms=${executionMs} gateway=${pricingSource}`);
    }
  }

  return {
    ...response,
    execution_ms: executionMs,
  };
}
