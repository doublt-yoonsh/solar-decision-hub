// /lib/portfolio/concentration.ts
// HHI-based concentration metrics for a portfolio.
// All return values are 0..10000 (10000 = monopoly / fully concentrated).

import type { PlantInput } from "../types/PlantInput";
import { hhi } from "../shared/statistics";

function shareByKey<T>(
  plants: PlantInput[],
  keyFn: (p: PlantInput) => T,
): number[] {
  const buckets = new Map<T, number>();
  let total = 0;
  for (const p of plants) {
    const k = keyFn(p);
    buckets.set(k, (buckets.get(k) ?? 0) + p.capacityKw);
    total += p.capacityKw;
  }
  if (total === 0) return [];
  return Array.from(buckets.values()).map((v) => v / total);
}

/** Concentration by sido (지역). */
export function hhiByRegion(plants: PlantInput[]): number {
  return hhi(shareByKey(plants, (p) => p.location.region.sido));
}

/** Concentration by site type (general/building/forest/water). */
export function hhiBySiteType(plants: PlantInput[]): number {
  return hhi(shareByKey(plants, (p) => p.siteType));
}

/** Concentration by grid system (main vs jeju). */
export function hhiByGrid(plants: PlantInput[]): number {
  return hhi(
    shareByKey(plants, (p) =>
      p.location.region.sido.includes("제주") ? "jeju" : "main",
    ),
  );
}
