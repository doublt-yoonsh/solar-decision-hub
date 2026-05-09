// /lib/simulator/scenarios/C.ts
// Scenario C — 2027 New Auction (RPS sunset → new contract market).
// All values are ESTIMATED — UI must always tag with "추정" badge.
// See docs/scenarios.md §C.

import { getWeight, curtailment } from "../../data";
import { npv as npvCalc, irr as irrCalc } from "../../shared/finance";
import type {
  ScenarioResult,
  YearlyBreakdown,
  AppliedAssumptionsC,
} from "../../types/ScenarioResult";
import type { SimulatorInput } from "../types";
import {
  SIMULATOR_DEFAULTS,
  calculateGeneration,
  curtailmentRegionKey,
  annualOpex,
} from "../baseline";

const C_DEFAULTS = {
  unitPrice: 130,
  contractYears: 20,
  policyRiskFactor: 1.0,
  startYear: 2027,
} as const;

function regionalCurtailment(sido: string): number {
  const key = curtailmentRegionKey(sido);
  const row = (
    curtailment.byRegion as Record<string, { avgRate: number } | undefined>
  )[key];
  return row?.avgRate ?? curtailment.byRegion.default.avgRate;
}

export function simulateScenarioC(input: SimulatorInput): ScenarioResult {
  const plant = input.plant;
  const opt = input.scenarioCOptions;
  const startYear = C_DEFAULTS.startYear;
  const discountRate = input.discountRate ?? SIMULATOR_DEFAULTS.DISCOUNT_RATE;
  const inflationRate = input.inflationRate ?? SIMULATOR_DEFAULTS.INFLATION_RATE;
  const contractYears = opt?.contractYears ?? C_DEFAULTS.contractYears;
  const baseUnitPrice = opt?.newAuctionPrice ?? C_DEFAULTS.unitPrice;
  const policyFactor = opt?.policyRiskFactor ?? C_DEFAULTS.policyRiskFactor;
  const effectiveUnitPrice = baseUnitPrice * policyFactor;

  const seriesGen = calculateGeneration(input, contractYears, startYear);
  const curtailmentRate =
    plant.curtailmentRate ?? regionalCurtailment(plant.location.region.sido);
  const weight =
    plant.weightOverride ?? getWeight(plant.siteType, plant.capacityKw);
  const opex = annualOpex(plant);

  const yearlyBreakdown: YearlyBreakdown[] = [];
  let totalRev = 0;
  let totalEffectiveGen = 0;
  for (let y = 0; y < contractYears; y++) {
    const gen = seriesGen[y]!;
    const effective = gen.generationKwh * (1 - curtailmentRate);
    totalEffectiveGen += effective;
    const yearTotal = effective * effectiveUnitPrice;
    totalRev += yearTotal;
    yearlyBreakdown.push({
      year: gen.year,
      smpRevenue: 0,
      recRevenue: 0,
      auctionRevenue: yearTotal,
      recAvailable: false,
      recReason: "시나리오 C: 단일 합산 단가 (REC 분리 거래 미가정)",
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

  const assumptions: AppliedAssumptionsC = {
    scenario: "C",
    discountRate,
    inflationRate,
    appliedWeight: weight,
    assumedUnitPrice: effectiveUnitPrice,
    contractYears,
    governmentPolicyRisk: policyFactor,
  };

  const warnings: string[] = [
    "시나리오 C는 정책 미확정 — 모든 수치가 추정값",
    `신규입찰단가 디폴트 ${C_DEFAULTS.unitPrice}원/kWh, 적용단가 ${effectiveUnitPrice.toFixed(1)}원/kWh`,
  ];

  return {
    scenario: "C",
    contractYears,
    yearlyBreakdown,
    totalRevenue: totalRev,
    npv: meanNpv,
    ...(irr !== undefined ? { irr } : {}),
    unitRevenue: totalEffectiveGen > 0 ? totalRev / totalEffectiveGen : 0,
    assumptions,
    warnings,
    computedAt: new Date().toISOString(),
  };
}
