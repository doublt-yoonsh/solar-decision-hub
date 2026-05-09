// /lib/simulator/baseline.ts
// Shared baseline generation profile used by every scenario.
// Pure function: given SimulatorInput it returns a deterministic annual series.

import { regionDefaults } from "../data";
import type { PlantInput } from "../types/PlantInput";
import type { SimulatorInput } from "./types";

/** Project-wide simulator defaults. */
export const SIMULATOR_DEFAULTS = {
  /**
   * PR baseline aligned with regionDefaults._meta.performanceRatioBaseline (0.85).
   * Korean PV systems average ~0.85; users can switch to 0.80 (conservative) or
   * 0.88 (optimistic) via the wizard slider.
   */
  PR: 0.85,
  DEGRADATION: 0.005,
  DISCOUNT_RATE: 0.05,
  INFLATION_RATE: 0,
  RPS_SUNSET_YEAR: 2027,
  ITERATIONS: 1000,
  SEED: 42,
  SMP_VOLATILITY: 0.15,
  START_YEAR: 2026,
  OPEX_PER_KW_YR: 25000,
} as const;

export interface YearlyGeneration {
  /** Calendar year (e.g. 2026). */
  year: number;
  /** 0-based contract year index (year-1 → 0). */
  yearIndex: number;
  /** Gross generation before curtailment (kWh). */
  generationKwh: number;
  /** kWh lost to curtailment (regionalized). */
  curtailedKwh: number;
  /** generationKwh − curtailedKwh. */
  effectiveKwh: number;
}

/** annualKwhPerKw resolution priority: explicit > plant override > sido default. */
function resolveAnnualKwhPerKw(plant: PlantInput, override?: number): number {
  if (override) return override;
  if (plant.location.solarIrradiance) {
    return plant.location.solarIrradiance.annualKwhPerKw;
  }
  const sido = plant.location.region.sido;
  const bySido = (
    regionDefaults.bySido as Record<
      string,
      { annualKwhPerKw: number; peakSunHours: number } | undefined
    >
  )[sido];
  if (bySido) return bySido.annualKwhPerKw;
  return regionDefaults.default.annualKwhPerKw;
}

/**
 * Yearly generation series. The seed annualKwhPerKw is treated as PR=0.80
 * baseline (per regionDefaults._meta.notes); user PR overrides scale linearly.
 *
 * Curtailment is intentionally NOT applied here unless the user explicitly set
 * `plant.curtailmentRate`. Each scenario factors in regional curtailment in
 * its own pass — keeps regionalized logic out of this primitive.
 */
export function calculateGeneration(
  input: SimulatorInput,
  years: number,
  startYear: number,
): YearlyGeneration[] {
  const plant = input.plant;
  const annualKwhPerKw = resolveAnnualKwhPerKw(plant, input.annualKwhPerKw);
  const pr = plant.performanceRatio ?? SIMULATOR_DEFAULTS.PR;
  const degradation = plant.degradationRate ?? SIMULATOR_DEFAULTS.DEGRADATION;
  const explicitCurtailment = plant.curtailmentRate ?? 0;

  // Seed data has PR=0.80 baked in. Scale only when user PR diverges.
  const baseGenKwh = plant.capacityKw * annualKwhPerKw * (pr / SIMULATOR_DEFAULTS.PR);

  const series: YearlyGeneration[] = [];
  for (let i = 0; i < years; i++) {
    const generationKwh = baseGenKwh * Math.pow(1 - degradation, i);
    const curtailedKwh = generationKwh * explicitCurtailment;
    series.push({
      year: startYear + i,
      yearIndex: i,
      generationKwh,
      curtailedKwh,
      effectiveKwh: generationKwh - curtailedKwh,
    });
  }
  return series;
}

/**
 * Map sido → region key in curtailment.json.
 * Falls back to 'default' for unmapped/unknown sidos.
 */
export function curtailmentRegionKey(sido: string): string {
  if (sido.includes("제주")) return "jeju";
  if (
    sido.includes("전라") ||
    sido.includes("전북") ||
    sido.includes("전남") ||
    sido.includes("광주")
  ) {
    return "honam";
  }
  if (
    sido.includes("경상") ||
    sido.includes("경북") ||
    sido.includes("경남") ||
    sido.includes("부산") ||
    sido.includes("대구") ||
    sido.includes("울산")
  ) {
    return "yeongnam";
  }
  if (
    sido.includes("서울") ||
    sido.includes("경기") ||
    sido.includes("인천") ||
    sido.includes("충") ||
    sido.includes("대전") ||
    sido.includes("세종") ||
    sido.includes("강원")
  ) {
    return "central";
  }
  return "default";
}

/** Effective annual OPEX (KRW) for a plant. */
export function annualOpex(plant: PlantInput): number {
  if (plant.opexAnnualOverride !== undefined) return plant.opexAnnualOverride;
  const rate = plant.opexPerKwYr ?? SIMULATOR_DEFAULTS.OPEX_PER_KW_YR;
  return rate * plant.capacityKw;
}
