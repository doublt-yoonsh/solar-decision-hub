// /lib/simulator/scenarios/B.ts
// Scenario B — Fixed FIT (고정가격경쟁입찰), 20-year fixed contract.
// Revenue = generation × [smpBaseValue + recValue × (userWeight / 1.0)].
// auctionResults.json provides smpBaseValue (estimated 80원) + recValue per round.
// See docs/scenarios.md §B.

import { auctionResults, getWeight, curtailment } from "../../data";
import { npv as npvCalc, irr as irrCalc } from "../../shared/finance";
import type {
  ScenarioResult,
  YearlyBreakdown,
  AppliedAssumptionsB,
  SmpBaseSource,
} from "../../types/ScenarioResult";
import type { SimulatorInput } from "../types";
import {
  SIMULATOR_DEFAULTS,
  calculateGeneration,
  curtailmentRegionKey,
  annualOpex,
} from "../baseline";

const CONTRACT_YEARS_B = 20;

interface AuctionRow {
  year: number;
  round: number;
  capacityBand: string;
  winningPrice: number;
  smpBaseValue: number;
  recValue: number;
  smpBaseSource: SmpBaseSource;
}

/** Most recent auction row for the matching capacity band. */
function pickAuctionRow(capacityKw: number): AuctionRow {
  const band = capacityKw < 100 ? "lt100kw" : "lt3mw";
  const candidates = auctionResults.results
    .filter((r) => r.capacityBand === band)
    .sort((a, b) => b.year - a.year || b.round - a.round);
  return (candidates[0] ?? auctionResults.results[0]) as AuctionRow;
}

function regionalCurtailment(sido: string): number {
  const key = curtailmentRegionKey(sido);
  const row = (
    curtailment.byRegion as Record<string, { avgRate: number } | undefined>
  )[key];
  return row?.avgRate ?? curtailment.byRegion.default.avgRate;
}

export function simulateScenarioB(input: SimulatorInput): ScenarioResult {
  const plant = input.plant;
  const startYear = input.startYear ?? SIMULATOR_DEFAULTS.START_YEAR;
  const discountRate = input.discountRate ?? SIMULATOR_DEFAULTS.DISCOUNT_RATE;
  const inflationRate = input.inflationRate ?? SIMULATOR_DEFAULTS.INFLATION_RATE;

  const auctionRow = pickAuctionRow(plant.capacityKw);
  const smpBaseValue =
    input.scenarioBOptions?.smpBaseValueOverride ?? auctionRow.smpBaseValue;
  const recValue = auctionRow.recValue;

  const seriesGen = calculateGeneration(input, CONTRACT_YEARS_B, startYear);
  const curtailmentRate =
    plant.curtailmentRate ?? regionalCurtailment(plant.location.region.sido);
  const weight =
    plant.weightOverride ?? getWeight(plant.siteType, plant.capacityKw);
  const opex = annualOpex(plant);

  const yearlyBreakdown: YearlyBreakdown[] = [];
  let totalRev = 0;
  let totalEffectiveGen = 0;
  for (let y = 0; y < CONTRACT_YEARS_B; y++) {
    const gen = seriesGen[y]!;
    const effective = gen.generationKwh * (1 - curtailmentRate);
    totalEffectiveGen += effective;
    // Decomposed revenue (kept separate for UI tooltip clarity).
    const smpRev = effective * smpBaseValue;
    const recRev = effective * recValue * weight;
    const yearTotal = smpRev + recRev;
    totalRev += yearTotal;
    yearlyBreakdown.push({
      year: gen.year,
      smpRevenue: smpRev,
      recRevenue: recRev,
      recAvailable: true,
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

  const assumptions: AppliedAssumptionsB = {
    scenario: "B",
    discountRate,
    inflationRate,
    appliedWeight: weight,
    auctionYear: auctionRow.year,
    smpBaseValue,
    recValue,
    smpBaseSource: auctionRow.smpBaseSource,
    contractYears: 20,
  };

  const warnings: string[] = [];
  if (auctionRow.smpBaseSource === "estimated") {
    warnings.push(
      `smpBaseValue=${smpBaseValue}원/kWh는 추정 분해 (smpBaseSource: 'estimated')`,
    );
  }

  return {
    scenario: "B",
    contractYears: CONTRACT_YEARS_B,
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
