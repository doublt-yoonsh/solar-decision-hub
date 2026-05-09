// /lib/simulator/types.ts
// Input contract for the 4-scenario simulator. Output is the project-wide
// ScenarioResult (see /lib/types/ScenarioResult.ts).

import type { PlantInput } from "../types/PlantInput";

export interface ScenarioBOptions {
  /** Override the auction headline price (원/kWh). */
  auctionPriceOverride?: number;
  /** Override the smpBaseValue (원/kWh) used for the decomposition. */
  smpBaseValueOverride?: number;
}

export interface ScenarioCOptions {
  /** New-auction unit price (원/kWh). Default 130, slider 100..200. */
  newAuctionPrice?: number;
  /** Contract length in years. Default 20, slider 15..25. */
  contractYears?: number;
  /** Government policy risk multiplier (0..1). Lower = more haircut. */
  policyRiskFactor?: number;
}

export interface ScenarioDOptions {
  /** PPA unit price (원/kWh). Default 160, slider 130..200. */
  ppaUnitPrice?: number;
  /** KEPCO transmission/distribution fee (원/kWh). Default 12, slider 5..20. */
  transmissionFee?: number;
  /** Contract length in years. Default 10, slider 5..20. */
  contractYears?: number;
  /** Optional RE100 premium (원/kWh) added on top of ppaUnitPrice. */
  re100Premium?: number;
}

export interface SimulatorInput {
  plant: PlantInput;
  /** σ as a fraction of mean SMP — default 0.15. */
  smpVolatility?: number;
  /** NPV discount rate — default 0.05. */
  discountRate?: number;
  /** Inflation rate — default 0 (off). */
  inflationRate?: number;
  /** Monte Carlo iterations — default 1000. */
  iterations?: number;
  /** RNG seed — default 42 (reproducible across reruns). */
  seed?: number;
  /** Override annualKwhPerKw — default = regionDefaults lookup. */
  annualKwhPerKw?: number;
  /** Override mean SMP (원/kWh) — bypasses avgSmpMain12m(). Used by sensitivity analysis. */
  meanSmpOverride?: number;
  /** REC sunset (calendar) year — REC issuance stops at and after this year. */
  recSunsetYear?: number;
  /** Project start (year-1) calendar year. Default 2026. */
  startYear?: number;

  scenarioBOptions?: ScenarioBOptions;
  scenarioCOptions?: ScenarioCOptions;
  scenarioDOptions?: ScenarioDOptions;
}
