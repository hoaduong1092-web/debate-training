/**
 * Fallacy Aggregator Service (v15.0.0)
 *
 * Source of Truth: 07_SCORING_SPEC.md & Blueprint V15.0
 * Pure deterministic aggregation — zero LLM calls.
 * Extracts, filters metadata wrappers, counts occurrences, ranks by frequency,
 * and maps pedagogical remediation tips.
 */

import { getFallacyPedagogy } from './dictionaries/fallacyPedagogy';

export interface FallacyStatItem {
  name: string;
  vietnameseName: string;
  count: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  lastSeen: string;
  remediationTip: string;
}

export interface FallacyAggregationResult {
  topFallacies: FallacyStatItem[];
  totalFallaciesDetected: number;
  uniqueFallacyTypesCount: number;
}

export interface TranscriptLike {
  fallaciesDetected?: unknown;
  createdAt?: Date | string;
}

/**
 * Strips internal `__voice__` and `__coach__` metadata tokens from transcript fallacies.
 * Returns only true debate fallacy strings.
 */
export function extractCleanFallacies(rawFallacies: unknown): string[] {
  if (!rawFallacies) return [];

  let items: unknown[] = [];
  if (Array.isArray(rawFallacies)) {
    items = rawFallacies;
  } else if (typeof rawFallacies === 'string') {
    try {
      const parsed = JSON.parse(rawFallacies);
      if (Array.isArray(parsed)) {
        items = parsed;
      } else {
        items = [rawFallacies];
      }
    } catch {
      items = [rawFallacies];
    }
  }

  const cleanList: string[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (
        trimmed.length > 0 &&
        !trimmed.startsWith('__voice__') &&
        !trimmed.startsWith('__coach__') &&
        !trimmed.startsWith('{')
      ) {
        cleanList.push(trimmed);
      }
    }
  }

  return cleanList;
}

/**
 * Aggregates detected fallacies across a collection of transcripts.
 */
export function aggregateFallacies(transcripts: TranscriptLike[]): FallacyAggregationResult {
  const map = new Map<string, { count: number; lastSeen: Date }>();

  for (const tx of transcripts) {
    const cleanFallacies = extractCleanFallacies(tx.fallaciesDetected);
    const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();

    for (const f of cleanFallacies) {
      const existing = map.get(f);
      if (existing) {
        existing.count += 1;
        if (txDate > existing.lastSeen) {
          existing.lastSeen = txDate;
        }
      } else {
        map.set(f, { count: 1, lastSeen: txDate });
      }
    }
  }

  const topFallacies: FallacyStatItem[] = Array.from(map.entries())
    .map(([name, data]) => {
      const pedagogy = getFallacyPedagogy(name);
      return {
        name,
        vietnameseName: pedagogy.vietnameseName,
        count: data.count,
        severity: pedagogy.severity,
        lastSeen: data.lastSeen.toISOString(),
        remediationTip: pedagogy.remediationTip,
      };
    })
    .sort((a, b) => b.count - a.count);

  const totalFallaciesDetected = topFallacies.reduce((acc, curr) => acc + curr.count, 0);

  return {
    topFallacies,
    totalFallaciesDetected,
    uniqueFallacyTypesCount: topFallacies.length,
  };
}
