// PlantInput.ts
// User-supplied input describing one solar power plant.
// All optional fields fall back to /lib/defaults/.
// Site-type + capacity drive REC weight via getWeight() in /lib/data/weights.

import type { PlantLocation } from './PlantLocation';

/** Site classification — matches weights.json keys. */
export type SiteType = 'general' | 'building' | 'forest' | 'water';

/** Which market scheme the plant currently operates under (optional). */
export type CurrentScenario = 'A' | 'B' | 'C' | 'D';

/** Weight bracket derived from capacityKw — exported for type reuse. */
export type CapacityBand = 'lt100kw' | 'lt3mw' | 'gte3mw';

export interface PlantInput {
  /** Client-generated UUID, stable across edits. */
  id: string;

  /** Optional human-readable name (e.g. "영주 1호기"). */
  name?: string;

  // -- Capacity & site ----------------------------------------------------
  /** Installed capacity in kW (DC nameplate). */
  capacityKw: number;

  /** Site classification — drives REC weight lookup. */
  siteType: SiteType;

  /**
   * User-specified weight override (skips automatic lookup).
   * Set when user has a verified weight different from the table default.
   */
  weightOverride?: number;

  // -- Location -----------------------------------------------------------
  location: PlantLocation;

  // -- Generation assumptions (overrides defaults) ------------------------
  /** Performance Ratio. Default 0.80 — see docs/assumptions.md. */
  performanceRatio?: number;

  /** Annual degradation rate (e.g. 0.005 = 0.5%/yr). Default 0.005. */
  degradationRate?: number;

  /** Curtailment rate 0~1. Default = curtailment.json by region. */
  curtailmentRate?: number;

  // -- Operational info (optional, used for benchmarking & IRR) ----------
  /** Commercial operation date in ISO 8601 (YYYY-MM-DD). */
  commissioningDate?: string;

  /** Initial CAPEX in KRW (enables IRR computation). */
  capex?: number;

  /**
   * OPEX rate in KRW per kW per year. Default 25,000 — see docs/assumptions.md.
   * Effective annual OPEX = opexAnnualOverride ?? (opexPerKwYr * capacityKw).
   */
  opexPerKwYr?: number;

  /** Explicit annual OPEX (KRW) — wins over opexPerKwYr × capacityKw. */
  opexAnnualOverride?: number;

  /** Current contract scheme, if known. */
  currentScenario?: CurrentScenario;
}
