// /lib/location/types.ts
// Types for the location enrichment pipeline.
// Every external response carries a `sourceMeta` so the UI can render
// real / mock / fallback badges consistently.

import type { GridSystem } from '../types/PlantLocation';
import type { SiteType } from '../types/PlantInput';

/** Provenance of a value in any location response. */
export type DataSource = 'real' | 'mock' | 'fallback';

/** Confidence level — surfaces as the badge tone in UI. */
export type Confidence = 'high' | 'medium' | 'low';

/** Carried on every external lookup result. */
export interface SourceMeta {
  source: DataSource;
  confidence: Confidence;
  /** Short human-readable note (e.g. "no API key — mock mode"). */
  notes?: string;
}

/** Common Korean address breakdown. */
export interface AddressRegion {
  sido: string;
  sigungu: string;
  eupmyeondong?: string;
}

/** A single match from a forward (text → coordinate) geocoding query. */
export interface GeocodingMatch {
  address: string;
  addressType: 'road' | 'jibun' | 'unknown';
  lat: number;
  lng: number;
  region: AddressRegion;
  buildingName?: string;
}

/** Result of forward geocoding — address text → coordinates. */
export interface GeocodingResult {
  query: string;
  matches: GeocodingMatch[];
  sourceMeta: SourceMeta;
}

/** Result of reverse geocoding — coordinates → address. */
export interface ReverseGeocodingResult {
  lat: number;
  lng: number;
  address: string;
  addressType: 'road' | 'jibun' | 'unknown';
  region: AddressRegion;
  buildingName?: string;
  sourceMeta: SourceMeta;
}

/** PVGIS-shaped solar irradiance / production estimate. */
export interface PvgisResult {
  lat: number;
  lng: number;
  /** Annual generation per kW installed (PVGIS E_y). */
  annualKwhPerKw: number;
  /** Daily peak sun hours. */
  peakSunHours: number;
  /** Annual incident irradiation per m² (PVGIS H(i)_y, kWh/m²/yr). */
  annualIrradiationKwhPerM2?: number;
  /** Performance Ratio derived from PVGIS as E_y / H(i)_y.
   *  Coordinate-specific incl. environmental losses (AoI, temp, spectral). */
  derivedPR?: number;
  /** Optional 12-month series — may be absent in mock mode. */
  monthlyProduction?: Array<{ month: number; kwhPerKw: number }>;
  sourceMeta: SourceMeta;
}

/** Heuristic site-type inference from address text (VWorld replacement in v1). */
export interface SiteTypeHint {
  inferred: SiteType;
  confidence: Confidence;
  /** Human-readable rule that fired (e.g. "지번에 '산' 포함"). */
  reason: string;
  sourceMeta: SourceMeta;
}

/** Nearest substation lookup result. */
export interface NearestSubstationResult {
  name: string;
  voltageKv: number;
  grid: GridSystem;
  region: string;
  distanceKm: number;
  /** True when distance > 50km and we fell back to regional defaults. */
  fallbackUsed: boolean;
  sourceMeta: SourceMeta;
}

/** A step that failed during enrichment, surfaced to the UI for transparency. */
export interface EnrichmentFailure {
  step:
    | "reverse-geocode"
    | "pvgis"
    | "site-type"
    | "substation"
    | "supply-zone";
  error: string;
}

/**
 * Combined enrichment result. Partial-failure friendly — any successful
 * sub-result is included; the rest is reported via `partialFailures`.
 */
export interface EnrichmentResult {
  lat: number;
  lng: number;
  address?: ReverseGeocodingResult;
  irradiance?: PvgisResult;
  siteTypeHint?: SiteTypeHint;
  nearestSubstation?: NearestSubstationResult;
  /** KEPCO supply zone (region → 공급변전소 code → narrowed candidates). */
  supplyZone?: import("./supplyZone").SupplyZoneResult;
  partialFailures: EnrichmentFailure[];
  /** ISO timestamp of computation. */
  computedAt: string;
}
