// /lib/portfolio/policyRisk.ts
// Composite policy risk score for a portfolio.
// Returns the breakdown defined in PortfolioMetrics (see /lib/types/).

import type { PlantInput, CurrentScenario } from "../types/PlantInput";
import type { PolicyRiskBreakdown } from "../types/PortfolioMetrics";

const FORMULA_VERSION = "v1.0";
const FORMULA_DESCRIPTION =
  "A 비중 × 30 (REC 폐지 영향) + C 비중 × 40 (정책 미확정) + sunset±5y 신설 비중 × 30";

const SUNSET_YEAR = 2027;
const SUNSET_HORIZON_Y = 5;

/**
 * Compute portfolio-level policy risk.
 * Plants without `currentScenario` are conservatively classified as 'A'
 * (most exposed to RPS sunset).
 */
export function computePolicyRisk(plants: PlantInput[]): PolicyRiskBreakdown {
  if (plants.length === 0) {
    return {
      totalScore: 0,
      components: {
        scenarioAExposure: 0,
        scenarioCExposure: 0,
        sunsetTimingRisk: 0,
      },
      formulaVersion: FORMULA_VERSION,
      formulaDescription: FORMULA_DESCRIPTION,
    };
  }

  let totalCap = 0;
  let capA = 0;
  let capC = 0;
  let capSunsetRisk = 0;

  for (const p of plants) {
    totalCap += p.capacityKw;
    const scn: CurrentScenario = p.currentScenario ?? "A";
    if (scn === "A") capA += p.capacityKw;
    if (scn === "C") capC += p.capacityKw;

    if (p.commissioningDate) {
      const year = parseInt(p.commissioningDate.slice(0, 4), 10);
      if (
        Number.isFinite(year) &&
        year >= SUNSET_YEAR - SUNSET_HORIZON_Y &&
        year <= SUNSET_YEAR + SUNSET_HORIZON_Y
      ) {
        capSunsetRisk += p.capacityKw;
      }
    } else {
      // Default: half exposed when commissioning date is unknown.
      capSunsetRisk += p.capacityKw * 0.5;
    }
  }

  const aShare = capA / totalCap;
  const cShare = capC / totalCap;
  const sunsetShare = capSunsetRisk / totalCap;

  const scenarioAExposure = aShare * 30;
  const scenarioCExposure = cShare * 40;
  const sunsetTimingRisk = sunsetShare * 30;

  const totalScore = Math.min(
    100,
    scenarioAExposure + scenarioCExposure + sunsetTimingRisk,
  );

  return {
    totalScore,
    components: { scenarioAExposure, scenarioCExposure, sunsetTimingRisk },
    formulaVersion: FORMULA_VERSION,
    formulaDescription: FORMULA_DESCRIPTION,
  };
}
