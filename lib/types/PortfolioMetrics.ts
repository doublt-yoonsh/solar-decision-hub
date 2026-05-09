// PortfolioMetrics.ts
// Aggregate metrics computed across multiple plants for risk/diversification UI.

import type { PlantInput } from './PlantInput';
import type { ScenarioId } from './ScenarioResult';

/** Decomposition of policy risk score for transparency in UI. */
export interface PolicyRiskBreakdown {
  /** Composite score 0..100 (higher = riskier). */
  totalScore: number;
  /** Sub-scores summing into the composite (each 0..100). */
  components: {
    /** Penalty from heavy exposure to scenario A (REC sunset risk). */
    scenarioAExposure: number;
    /** Penalty from heavy exposure to scenario C (policy-uncertain). */
    scenarioCExposure: number;
    /** Penalty from contracts ending close to RPS sunset / policy reset. */
    sunsetTimingRisk: number;
  };
  /** Version tag of the formula (bump when changed). */
  formulaVersion: string;
  /** Human-readable description shown in tooltip / docs page. */
  formulaDescription: string;
}

/** One actionable recommendation surfaced to the user. */
export interface PortfolioRecommendation {
  type: 'diversify' | 'rebalance' | 'hedge' | 'warn';
  severity: 'low' | 'medium' | 'high';
  message: string;
  /** PlantInput.id values this recommendation refers to. */
  affectedPlantIds: string[];
}

/** Per-scenario exposure across the portfolio. */
export interface ScenarioExposure {
  plantCount: number;
  capacityKw: number;
  /** Share of total revenue this scenario contributes (0..1). */
  revenueShare: number;
}

export interface PortfolioMetrics {
  /** Snapshot of plants the metrics were computed from. */
  plants: PlantInput[];

  // -- Totals -------------------------------------------------------------
  totalCapacityKw: number;
  /** Annual revenue under each plant's currentScenario (or default A). */
  totalAnnualRevenue: number;

  // -- Concentration (HHI 0..10000, lower = more diversified) -------------
  /** Concentration by sido/sigungu. */
  concentrationByRegion: number;
  /** Concentration by siteType. */
  concentrationBySiteType: number;
  /** Concentration by grid system (main vs jeju). */
  concentrationByGrid: number;

  // -- Exposure -----------------------------------------------------------
  scenarioExposure: Record<ScenarioId, ScenarioExposure>;

  /** Capacity-weighted curtailment exposure (0..1). */
  weightedCurtailmentRate: number;

  // -- Risk score ---------------------------------------------------------
  /**
   * Composite policy risk (0..100) plus its component decomposition.
   * Penalises portfolios heavy in scenarios A (REC sunset) and C (uncertain).
   */
  policyRisk: PolicyRiskBreakdown;

  // -- Recommendations ----------------------------------------------------
  recommendations: PortfolioRecommendation[];

  /** ISO timestamp of computation. */
  computedAt: string;
}
