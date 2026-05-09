// /lib/location/enrich.ts
// Combined location enrichment pipeline.
// Each sub-step runs independently; a failure in one is captured in
// `partialFailures` rather than aborting the whole pipeline.

import type { EnrichmentResult, EnrichmentFailure } from "./types";
import { reverseGeocode } from "./kakao";
import { getYearlyGenHours } from "./pvgis";
import { inferSiteType } from "./siteTypeHeuristic";
import { findNearest } from "./substation";

/**
 * Run all enrichment steps for a coordinate, tolerating partial failures.
 * Caller renders any populated field; absent fields surface in `partialFailures`.
 */
export async function enrich(
  lat: number,
  lng: number,
): Promise<EnrichmentResult> {
  const failures: EnrichmentFailure[] = [];

  const result: EnrichmentResult = {
    lat,
    lng,
    partialFailures: failures,
    computedAt: new Date().toISOString(),
  };

  // 1) Reverse geocode (drives the address used by step 3).
  let addressText: string | undefined;
  try {
    const address = await reverseGeocode(lat, lng);
    result.address = address;
    addressText = address.address;
  } catch (e) {
    failures.push({ step: "reverse-geocode", error: errorMessage(e) });
  }

  // 2) PVGIS irradiance.
  try {
    result.irradiance = await getYearlyGenHours(lat, lng);
  } catch (e) {
    failures.push({ step: "pvgis", error: errorMessage(e) });
  }

  // 3) Site-type heuristic — needs address text. Skip if address failed.
  if (addressText) {
    try {
      result.siteTypeHint = inferSiteType(addressText);
    } catch (e) {
      failures.push({ step: "site-type", error: errorMessage(e) });
    }
  } else {
    failures.push({
      step: "site-type",
      error: "skipped — reverse geocode unavailable",
    });
  }

  // 4) Nearest substation — pure data lookup, rarely fails.
  try {
    result.nearestSubstation = findNearest(lat, lng);
  } catch (e) {
    failures.push({ step: "substation", error: errorMessage(e) });
  }

  return result;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
