// /lib/portfolio/curtailmentRisk.ts
// Capacity-weighted curtailment exposure across the portfolio.

import type { PlantInput } from "../types/PlantInput";
import { curtailment } from "../data";
import { curtailmentRegionKey } from "../simulator/baseline";

interface CurtailmentRow {
  avgRate: number;
}

function regionRate(sido: string): number {
  const key = curtailmentRegionKey(sido);
  const row = (
    curtailment.byRegion as Record<string, CurtailmentRow | undefined>
  )[key];
  return row?.avgRate ?? curtailment.byRegion.default.avgRate;
}

/** Capacity-weighted curtailment rate (0..1). */
export function weightedCurtailmentRate(plants: PlantInput[]): number {
  if (plants.length === 0) return 0;
  let totalCap = 0;
  let weighted = 0;
  for (const p of plants) {
    weighted += regionRate(p.location.region.sido) * p.capacityKw;
    totalCap += p.capacityKw;
  }
  return totalCap > 0 ? weighted / totalCap : 0;
}
