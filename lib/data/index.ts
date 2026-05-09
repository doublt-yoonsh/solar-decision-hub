// /lib/data/index.ts
// Static data layer entry point.
// Each JSON has a `_meta` header — see /docs/data-sources.md.

import smpData from './smp.json';
import recData from './rec.json';
import weightsData from './weights.json';
import auctionResultsData from './auctionResults.json';
import substationsData from './substations.json';
import curtailmentData from './curtailment.json';
import regionDefaultsData from './regionDefaults.json';

import type { SiteType, CapacityBand } from '../types/PlantInput';

// -- Raw data exports ---------------------------------------------------

export const smp = smpData;
export const rec = recData;
export const weights = weightsData;
export const auctionResults = auctionResultsData;
export const substations = substationsData;
export const curtailment = curtailmentData;
export const regionDefaults = regionDefaultsData;

// -- Metadata exports ---------------------------------------------------

/**
 * Per-file metadata (`_meta` headers) — used by UI for credibility badges and
 * "이 데이터의 출처/한계" tooltips. Always rendered on result cards & PDF.
 */
export const dataMeta = {
  smp: smpData._meta,
  rec: recData._meta,
  weights: weightsData._meta,
  auctionResults: auctionResultsData._meta,
  substations: substationsData._meta,
  curtailment: curtailmentData._meta,
  regionDefaults: regionDefaultsData._meta,
} as const;

/**
 * Precision tag per dataset — driven by user-confirmed v1 trade-offs.
 * UI MUST display "이 시뮬레이션의 데이터 정밀도" with these labels.
 */
export const DATA_PRECISION = {
  smp: 'monthly-average',
  rec: 'monthly-average',
  weights: 'official-table',
  auctionResults: 'estimated-decomposition',
  substations: 'sparse-seed-12',
  curtailment: 'estimated-aggregate',
  regionDefaults: 'sido-average',
} as const;

export type DatasetKey = keyof typeof DATA_PRECISION;
export type DataPrecisionLabel = typeof DATA_PRECISION[DatasetKey];

/**
 * Credibility level per dataset — drives the badge color/tone in UI.
 * Sources are LOW when official aggregate stats are absent (curtailment, sparse substations).
 */
export const DATA_CREDIBILITY = {
  smp: 'medium',
  rec: 'medium',
  weights: 'medium',
  auctionResults: 'medium',
  substations: 'low',
  curtailment: 'low',
  regionDefaults: 'medium',
} as const;

export type CredibilityLevel = typeof DATA_CREDIBILITY[DatasetKey];

// -- Helpers ------------------------------------------------------------

/**
 * Map a capacity (kW) to its REC weight bracket.
 *   < 100         → lt100kw
 *   100  ~ <3000  → lt3mw
 *   >= 3000       → gte3mw
 */
export function capacityBand(capacityKw: number): CapacityBand {
  if (capacityKw < 100) return 'lt100kw';
  if (capacityKw < 3000) return 'lt3mw';
  return 'gte3mw';
}

/**
 * Look up REC weight for a given site type and capacity.
 * Uses /lib/data/weights.json as the source of truth.
 */
export function getWeight(siteType: SiteType, capacityKw: number): number {
  const band = capacityBand(capacityKw);
  return weightsData.weights[siteType][band];
}

/** Convenience: latest available SMP monthly average for the main grid. */
export function latestSmpMain(): number {
  const last = smpData.main.monthly[smpData.main.monthly.length - 1];
  return last!.value;
}

/** Convenience: 12-month trailing average SMP for the main grid (원/kWh). */
export function avgSmpMain12m(): number {
  const series = smpData.main.monthly.slice(-12);
  const sum = series.reduce((acc, p) => acc + p.value, 0);
  return sum / series.length;
}

/** Convenience: 12-month trailing average REC price (원/REC). */
export function avgRec12m(): number {
  const series = recData.monthly.slice(-12);
  const sum = series.reduce((acc, p) => acc + p.value, 0);
  return sum / series.length;
}
