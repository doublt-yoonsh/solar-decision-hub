// ScenarioResult.ts
// Output of one scenario simulation. Designed so the result UI can render
// uniform comparison cards across A/B/C/D while preserving scenario-specific
// breakdown (e.g. B's smpBaseValue / recValue split).

export type ScenarioId = 'A' | 'B' | 'C' | 'D';

/** Per-year breakdown including revenue components, OPEX, and net cashflow. */
export interface YearlyBreakdown {
  /** Calendar year. */
  year: number;
  /** SMP-derived revenue (A, B). 0 if not applicable to scenario. */
  smpRevenue: number;
  /** REC-derived revenue (A, B). 0 when recAvailable === false. */
  recRevenue: number;
  /** PPA gross revenue (D). Optional — only present in scenario D. */
  ppaRevenue?: number;
  /** Grid-fee deduction (D). Stored as a positive number; subtracted from revenue. */
  gridFee?: number;
  /** New-auction revenue (C). Optional — only present in scenario C. */
  auctionRevenue?: number;
  /** Whether REC issuance is active in this year (false from RPS sunset onward). */
  recAvailable: boolean;
  /** Human-readable reason when recAvailable === false (e.g. "RPS sunset (2027~)"). */
  recReason?: string;
  /** Total revenue (gross of OPEX) — sum of revenue components net of gridFee. */
  totalRevenue: number;
  /** Annual operating cost for this year (KRW). */
  opex: number;
  /** Net cashflow = totalRevenue − opex. */
  netCashflow: number;
}

/** Source of B's smpBaseValue: official auction notice value or our estimate. */
export type SmpBaseSource = 'official' | 'estimated';

/** Assumptions common to every scenario. */
interface CommonAssumptions {
  /** NPV discount rate, e.g. 0.05. */
  discountRate: number;
  /** Inflation rate (0 if disabled). */
  inflationRate: number;
  /** REC weight actually used (after siteType×capacity lookup or override). */
  appliedWeight: number;
}

/** Scenario A — Spot Market. */
export interface AppliedAssumptionsA extends CommonAssumptions {
  scenario: 'A';
  /** SMP price trajectory model used. */
  smpProjection: 'flat' | 'declining';
  /** REC price trend per contract year (length === contractYears). */
  recPriceTrend: number[];
  /** Calendar year when new REC issuance ends. */
  recSunsetYear: number;
  /** Curtailment rate applied (0..1). */
  curtailmentRate: number;
}

/** Scenario B — Fixed FIT (20-year). */
export interface AppliedAssumptionsB extends CommonAssumptions {
  scenario: 'B';
  /** Auction year used to source the winning price. */
  auctionYear: number;
  /** SMP base value (원/kWh) — decomposed from winning price. */
  smpBaseValue: number;
  /** REC value (원/kWh, weight 1.0 base) — decomposed from winning price. */
  recValue: number;
  /** Whether smpBaseValue came from auction notice or was estimated. */
  smpBaseSource: SmpBaseSource;
  /** Always 20 for scenario B. */
  contractYears: 20;
}

/** Scenario C — 2027 New Auction (estimated, policy uncertain). */
export interface AppliedAssumptionsC extends CommonAssumptions {
  scenario: 'C';
  /** Assumed unit price (원/kWh). */
  assumedUnitPrice: number;
  /** Contract length (years), slider 15..25. */
  contractYears: number;
  /** 0..1 risk score reflecting policy uncertainty. */
  governmentPolicyRisk: number;
}

/** Scenario D — Direct Corporate PPA. */
export interface AppliedAssumptionsD extends CommonAssumptions {
  scenario: 'D';
  /** Contracted PPA unit price (원/kWh). */
  ppaUnitPrice: number;
  /** KEPCO transmission/distribution fee (원/kWh). */
  transmissionFee: number;
  /** Contract length (years), slider 5..20. */
  contractYears: number;
  /** Optional RE100 premium (원/kWh) added on top of ppaUnitPrice. */
  re100Premium?: number;
}

/**
 * Discriminated union of applied assumptions, keyed by `scenario`.
 * Renderers and PDF export switch on `scenario` for type-safe access.
 */
export type AppliedAssumptions =
  | AppliedAssumptionsA
  | AppliedAssumptionsB
  | AppliedAssumptionsC
  | AppliedAssumptionsD;

/** Variability range for scenario A. */
export interface RiskRange {
  low: number;   // -30% scenario revenue
  mid: number;   // baseline
  high: number;  // +30%
}

export interface ScenarioResult {
  scenario: ScenarioId;

  /** Contract length used (years). */
  contractYears: number;

  /**
   * Year-by-year breakdown (length === contractYears).
   * The revenue series is derivable as `yearlyBreakdown.map(b => b.totalRevenue)`.
   */
  yearlyBreakdown: YearlyBreakdown[];

  /** Sum of yearlyBreakdown[].totalRevenue, with degradation/inflation already applied. */
  totalRevenue: number;

  /** Net Present Value at applied discount rate. */
  npv: number;

  /** IRR — only present if PlantInput.capex is provided. */
  irr?: number;

  /** Levelised revenue per kWh (totalRevenue / totalGeneration). */
  unitRevenue: number;

  /** Variability bounds (A scenario only). */
  riskRange?: RiskRange;

  /** All assumptions actually applied — drives "이 결과의 가정" UI. */
  assumptions: AppliedAssumptions;

  /** User-facing warnings (policy uncertainty, estimated splits, etc.). */
  warnings: string[];

  /** ISO timestamp of computation. */
  computedAt: string;
}
