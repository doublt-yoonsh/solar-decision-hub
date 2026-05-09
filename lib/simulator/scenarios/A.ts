// /lib/simulator/scenarios/A.ts
// Scenario A — Spot Market (SMP + REC).
// See docs/scenarios.md §A for the revenue formula and assumptions.

import { avgSmpMain12m, avgRec12m, getWeight, curtailment } from "../../data";
import { mulberry32, normal } from "../../shared/montecarlo";
import { percentile } from "../../shared/statistics";
import { npv as npvCalc, irr as irrCalc } from "../../shared/finance";
import type {
  ScenarioResult,
  YearlyBreakdown,
  AppliedAssumptionsA,
} from "../../types/ScenarioResult";
import type { SimulatorInput } from "../types";
import {
  SIMULATOR_DEFAULTS,
  calculateGeneration,
  curtailmentRegionKey,
  annualOpex,
} from "../baseline";

const CONTRACT_YEARS_A = 20;

interface CurtailmentRow {
  avgRate: number;
}

function regionalCurtailment(sido: string): number {
  const key = curtailmentRegionKey(sido);
  const row = (
    curtailment.byRegion as Record<string, CurtailmentRow | undefined>
  )[key];
  return row?.avgRate ?? curtailment.byRegion.default.avgRate;
}

export function simulateScenarioA(input: SimulatorInput): ScenarioResult {
  const plant = input.plant;
  const seed = input.seed ?? SIMULATOR_DEFAULTS.SEED;
  const iterations = input.iterations ?? SIMULATOR_DEFAULTS.ITERATIONS;
  const smpVol = input.smpVolatility ?? SIMULATOR_DEFAULTS.SMP_VOLATILITY;
  const discountRate = input.discountRate ?? SIMULATOR_DEFAULTS.DISCOUNT_RATE;
  const inflationRate = input.inflationRate ?? SIMULATOR_DEFAULTS.INFLATION_RATE;
  const recSunsetYear =
    input.recSunsetYear ?? SIMULATOR_DEFAULTS.RPS_SUNSET_YEAR;
  const startYear = input.startYear ?? SIMULATOR_DEFAULTS.START_YEAR;

  const seriesGen = calculateGeneration(input, CONTRACT_YEARS_A, startYear);
  const curtailmentRate =
    plant.curtailmentRate ?? regionalCurtailment(plant.location.region.sido);
  const weight =
    plant.weightOverride ?? getWeight(plant.siteType, plant.capacityKw);

  const meanSmp = input.meanSmpOverride ?? avgSmpMain12m();
  const meanRec = avgRec12m();
  const opex = annualOpex(plant);

  // REC trend: flat at 12-month mean until sunset, then 0.
  const recPriceTrend: number[] = [];
  for (let y = 0; y < CONTRACT_YEARS_A; y++) {
    recPriceTrend.push(seriesGen[y]!.year < recSunsetYear ? meanRec : 0);
  }

  // Monte Carlo over yearly SMP draws → NPV distribution.
  const rng = mulberry32(seed);
  const npvSamples: number[] = [];
  for (let it = 0; it < iterations; it++) {
    const cashflows: number[] = [0];
    for (let y = 0; y < CONTRACT_YEARS_A; y++) {
      const gen = seriesGen[y]!;
      const effective = gen.generationKwh * (1 - curtailmentRate);
      const smpDraw = Math.max(50, normal(rng, meanSmp, meanSmp * smpVol));
      const smpRev = effective * smpDraw;
      const recRev =
        recPriceTrend[y]! > 0
          ? (effective / 1000) * weight * recPriceTrend[y]!
          : 0;
      cashflows.push(smpRev + recRev);
    }
    npvSamples.push(npvCalc(cashflows, discountRate));
  }

  // Deterministic representative pass (mean SMP) → drives yearlyBreakdown.
  const yearlyBreakdown: YearlyBreakdown[] = [];
  let totalRev = 0;
  let totalEffectiveGen = 0;
  for (let y = 0; y < CONTRACT_YEARS_A; y++) {
    const gen = seriesGen[y]!;
    const effective = gen.generationKwh * (1 - curtailmentRate);
    totalEffectiveGen += effective;
    const smpRev = effective * meanSmp;
    const recActive = recPriceTrend[y]! > 0;
    const recRev = recActive
      ? (effective / 1000) * weight * recPriceTrend[y]!
      : 0;
    const yearTotal = smpRev + recRev;
    totalRev += yearTotal;
    yearlyBreakdown.push({
      year: gen.year,
      smpRevenue: smpRev,
      recRevenue: recRev,
      recAvailable: recActive,
      recReason: recActive ? undefined : `RPS sunset (${recSunsetYear}~)`,
      totalRevenue: yearTotal,
      opex,
      netCashflow: yearTotal - opex,
    });
  }

  const meanNpv = npvCalc(
    [0, ...yearlyBreakdown.map((b) => b.totalRevenue)],
    discountRate,
  );

  let irr: number | undefined;
  if (plant.capex && plant.capex > 0) {
    const r = irrCalc([
      -plant.capex,
      ...yearlyBreakdown.map((b) => b.netCashflow),
    ]);
    if (Number.isFinite(r)) irr = r;
  }

  const sortedNpv = [...npvSamples].sort((a, b) => a - b);
  const riskRange = {
    low: percentile(sortedNpv, 10),
    mid: percentile(sortedNpv, 50),
    high: percentile(sortedNpv, 90),
  };

  const assumptions: AppliedAssumptionsA = {
    scenario: "A",
    discountRate,
    inflationRate,
    appliedWeight: weight,
    smpProjection: "flat",
    recPriceTrend,
    recSunsetYear,
    curtailmentRate,
  };

  const warnings: string[] = [];
  if (curtailmentRegionKey(plant.location.region.sido) === "jeju") {
    warnings.push("제주 계통: 출력제어 빈도가 매우 높습니다 (avgRate 5%)");
  }
  if (recSunsetYear <= startYear + CONTRACT_YEARS_A) {
    warnings.push(
      `RPS 폐지 가정: ${recSunsetYear}년부터 신규 REC 발급이 0으로 처리됩니다`,
    );
  }

  return {
    scenario: "A",
    contractYears: CONTRACT_YEARS_A,
    yearlyBreakdown,
    totalRevenue: totalRev,
    npv: meanNpv,
    ...(irr !== undefined ? { irr } : {}),
    unitRevenue: totalEffectiveGen > 0 ? totalRev / totalEffectiveGen : 0,
    riskRange,
    assumptions,
    warnings,
    computedAt: new Date().toISOString(),
  };
}
