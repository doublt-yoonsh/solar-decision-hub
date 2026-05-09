// /lib/portfolio/index.ts
// Portfolio analysis entry point.
// For each plant, runs its currentScenario simulation (default 'A') with a
// reduced iteration count for speed (single-portfolio API call).

import type { PlantInput, CurrentScenario } from "../types/PlantInput";
import type {
  PortfolioMetrics,
  PortfolioRecommendation,
  ScenarioExposure,
} from "../types/PortfolioMetrics";
import type { ScenarioId } from "../types/ScenarioResult";
import { simulate } from "../simulator";
import { hhiByRegion, hhiBySiteType, hhiByGrid } from "./concentration";
import { weightedCurtailmentRate } from "./curtailmentRisk";
import { computePolicyRisk } from "./policyRisk";

export { hhiByRegion, hhiBySiteType, hhiByGrid } from "./concentration";
export { smpZeroExposure } from "./exposure";
export { weightedCurtailmentRate } from "./curtailmentRisk";
export { diversityScore } from "./diversity";
export { computePolicyRisk } from "./policyRisk";

const PORTFOLIO_ITERATIONS = 30;
const PORTFOLIO_SEED = 42;

interface ScenarioBucket {
  capacityKw: number;
  revenue: number;
  plantCount: number;
}

function emptyBucket(): ScenarioBucket {
  return { capacityKw: 0, revenue: 0, plantCount: 0 };
}

export function analyzePortfolio(plants: PlantInput[]): PortfolioMetrics {
  const totalCapacityKw = plants.reduce((s, p) => s + p.capacityKw, 0);

  const buckets: Record<ScenarioId, ScenarioBucket> = {
    A: emptyBucket(),
    B: emptyBucket(),
    C: emptyBucket(),
    D: emptyBucket(),
  };
  let totalAnnualRevenue = 0;

  for (const p of plants) {
    const scn: CurrentScenario = p.currentScenario ?? "A";
    const sim = simulate({
      plant: p,
      iterations: PORTFOLIO_ITERATIONS,
      seed: PORTFOLIO_SEED,
    });
    const result = sim.scenarios[scn];
    const firstYear = result.yearlyBreakdown[0]?.totalRevenue ?? 0;
    totalAnnualRevenue += firstYear;
    buckets[scn].capacityKw += p.capacityKw;
    buckets[scn].revenue += firstYear;
    buckets[scn].plantCount += 1;
  }

  const scenarioExposure: Record<ScenarioId, ScenarioExposure> = {
    A: makeExposure(buckets.A, totalAnnualRevenue),
    B: makeExposure(buckets.B, totalAnnualRevenue),
    C: makeExposure(buckets.C, totalAnnualRevenue),
    D: makeExposure(buckets.D, totalAnnualRevenue),
  };

  const concentrationByRegion = hhiByRegion(plants);
  const concentrationBySiteType = hhiBySiteType(plants);
  const concentrationByGrid = hhiByGrid(plants);
  const policyRisk = computePolicyRisk(plants);
  const wcr = weightedCurtailmentRate(plants);

  const recommendations: PortfolioRecommendation[] = [];
  if (concentrationByRegion > 5000) {
    recommendations.push({
      type: "diversify",
      severity: "high",
      message: "지역 집중도가 매우 높습니다 — 다른 권역 발전소 확보 권장",
      affectedPlantIds: plants.map((p) => p.id),
    });
  }
  if (concentrationByGrid > 7000) {
    recommendations.push({
      type: "diversify",
      severity: "medium",
      message: "본토/제주 계통 분산이 부족합니다",
      affectedPlantIds: plants.map((p) => p.id),
    });
  }
  if (scenarioExposure.A.revenueShare > 0.7) {
    recommendations.push({
      type: "hedge",
      severity: "high",
      message:
        "시나리오 A 비중이 매우 높음 — REC 폐지(2027) 위험 노출. B/C로 분산 고려",
      affectedPlantIds: plants
        .filter((p) => (p.currentScenario ?? "A") === "A")
        .map((p) => p.id),
    });
  }
  if (policyRisk.totalScore > 60) {
    recommendations.push({
      type: "warn",
      severity: "high",
      message: `정책리스크 점수 ${policyRisk.totalScore.toFixed(0)} — 시나리오 다변화 필요`,
      affectedPlantIds: plants.map((p) => p.id),
    });
  }
  if (wcr > 0.03) {
    recommendations.push({
      type: "rebalance",
      severity: "medium",
      message: `평균 출력제어 노출 ${(wcr * 100).toFixed(1)}% — 호남/제주 비중 재검토`,
      affectedPlantIds: plants.map((p) => p.id),
    });
  }

  return {
    plants,
    totalCapacityKw,
    totalAnnualRevenue,
    concentrationByRegion,
    concentrationBySiteType,
    concentrationByGrid,
    scenarioExposure,
    weightedCurtailmentRate: wcr,
    policyRisk,
    recommendations,
    computedAt: new Date().toISOString(),
  };
}

function makeExposure(
  bucket: ScenarioBucket,
  totalRevenue: number,
): ScenarioExposure {
  return {
    plantCount: bucket.plantCount,
    capacityKw: bucket.capacityKw,
    revenueShare: totalRevenue > 0 ? bucket.revenue / totalRevenue : 0,
  };
}
