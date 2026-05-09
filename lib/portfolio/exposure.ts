// /lib/portfolio/exposure.ts
// Cannibalization / SMP-zero exposure proxy. Capacity-weighted across plants.
//
// PROXY USAGE — limitation acknowledged:
//   현재 SMP 0원 발생 빈도는 출력제어 발생률(curtailment.json avgRate)을 proxy로
//   사용한다. 두 현상은 모두 재생E 공급 과잉이라는 같은 구조적 원인에서 발생하므로
//   도메인적으로는 합리적이지만, 시간대별 SMP 0원 발생 시간은 출력제어 빈도와
//   완전히 일치하지 않는다. 정확도 검증을 위해서는 KPX 시간별 SMP 통계를 별도로
//   시드해야 한다 — docs/roadmap.md "SMP-zero 시간대별 시드" 참고.

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

/**
 * Capacity-weighted exposure to SMP-zero / cannibalization (0..1).
 * Larger plants in high-curtailment regions raise the score.
 */
export function smpZeroExposure(plants: PlantInput[]): number {
  if (plants.length === 0) return 0;
  let totalCap = 0;
  let weighted = 0;
  for (const p of plants) {
    weighted += regionRate(p.location.region.sido) * p.capacityKw;
    totalCap += p.capacityKw;
  }
  return totalCap > 0 ? weighted / totalCap : 0;
}
