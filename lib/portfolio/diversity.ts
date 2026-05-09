// /lib/portfolio/diversity.ts
// Simpson's diversity index across (sido × siteType) classes.
// 0 = no diversity (all plants identical class), 1 = maximally diverse.

import type { PlantInput } from "../types/PlantInput";

/**
 * Simpson's D = 1 − Σ (n_i × (n_i − 1) / (N × (N − 1))).
 * Returns 0 for N ≤ 1. Combines region (sido) and siteType for class buckets.
 */
export function diversityScore(plants: PlantInput[]): number {
  const n = plants.length;
  if (n <= 1) return 0;

  const counts = new Map<string, number>();
  for (const p of plants) {
    const key = `${p.location.region.sido}|${p.siteType}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let sum = 0;
  for (const c of Array.from(counts.values())) {
    sum += (c * (c - 1)) / (n * (n - 1));
  }
  return 1 - sum;
}
