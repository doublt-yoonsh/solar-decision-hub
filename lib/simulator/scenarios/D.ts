// /lib/simulator/scenarios/D.ts
// Scenario D — Direct Corporate PPA.
// Revenue = generation × [ppaUnitPrice + re100Premium − transmissionFee].
// See docs/scenarios.md §D.

import { curtailment } from "../../data";
import { npv as npvCalc, irr as irrCalc } from "../../shared/finance";
import type {
  ScenarioResult,
  YearlyBreakdown,
  AppliedAssumptionsD,
} from "../../types/ScenarioResult";
import type { SimulatorInput } from "../types";
import {
  SIMULATOR_DEFAULTS,
  calculateGeneration,
  curtailmentRegionKey,
  annualOpex,
} from "../baseline";

const D_DEFAULTS = {
  ppaUnitPrice: 160,
  transmissionFee: 12,
  contractYears: 10,
  re100Premium: 0,
} as const;

function regionalCurtailment(sido: string): number {
  const key = curtailmentRegionKey(sido);
  const row = (
    curtailment.byRegion as Record<string, { avgRate: number } | undefined>
  )[key];
  return row?.avgRate ?? curtailment.byRegion.default.avgRate;
}

export function simulateScenarioD(input: SimulatorInput): ScenarioResult {
  const plant = input.plant;
  const opt = input.scenarioDOptions;
  const startYear = input.startYear ?? SIMULATOR_DEFAULTS.START_YEAR;
  const discountRate = input.discountRate ?? SIMULATOR_DEFAULTS.DISCOUNT_RATE;
  const inflationRate = input.inflationRate ?? SIMULATOR_DEFAULTS.INFLATION_RATE;
  const contractYears = opt?.contractYears ?? D_DEFAULTS.contractYears;
  const ppaUnitPrice = opt?.ppaUnitPrice ?? D_DEFAULTS.ppaUnitPrice;
  const transmissionFee = opt?.transmissionFee ?? D_DEFAULTS.transmissionFee;
  const re100Premium = opt?.re100Premium ?? D_DEFAULTS.re100Premium;

  const seriesGen = calculateGeneration(input, contractYears, startYear);
  const curtailmentRate =
    plant.curtailmentRate ?? regionalCurtailment(plant.location.region.sido);
  // PPA bundles REC into the unit price by default → weight effectively 1.0.
  const weight = plant.weightOverride ?? 1.0;
  const opex = annualOpex(plant);

  const yearlyBreakdown: YearlyBreakdown[] = [];
  let totalRev = 0;
  let totalEffectiveGen = 0;
  for (let y = 0; y < contractYears; y++) {
    const gen = seriesGen[y]!;
    const effective = gen.generationKwh * (1 - curtailmentRate);
    totalEffectiveGen += effective;
    const ppaRev = effective * (ppaUnitPrice + re100Premium);
    const gridFeeAmount = effective * transmissionFee;
    const yearTotal = ppaRev - gridFeeAmount;
    totalRev += yearTotal;
    yearlyBreakdown.push({
      year: gen.year,
      smpRevenue: 0,
      recRevenue: 0,
      ppaRevenue: ppaRev,
      gridFee: gridFeeAmount,
      recAvailable: false,
      recReason: "시나리오 D: PPA 단가에 REC 흡수 (디폴트)",
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

  const assumptions: AppliedAssumptionsD = {
    scenario: "D",
    discountRate,
    inflationRate,
    appliedWeight: weight,
    ppaUnitPrice,
    transmissionFee,
    contractYears,
    ...(re100Premium > 0 ? { re100Premium } : {}),
  };

  const netUnit = ppaUnitPrice + re100Premium - transmissionFee;
  const warnings: string[] = [
    "PPA 단가는 협상에 따라 가변 (sourceCredibility: medium)",
    `유효 단가 ${netUnit}원/kWh = ${ppaUnitPrice} + ${re100Premium} − ${transmissionFee}`,
  ];

  return {
    scenario: "D",
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
