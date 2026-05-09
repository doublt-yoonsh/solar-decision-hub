// /lib/location/enrich.ts
// Combined location enrichment pipeline.
// Runs Kakao + VWorld + PVGIS in parallel. Each step is independent — a
// failure in one is captured in `partialFailures` rather than aborting.
//
// Address priority:    Kakao primary  → VWorld fallback
// SiteType priority:   VWorld level5  → text heuristic fallback
// Irradiance:          PVGIS real     → mock estimator fallback
// Substation:          12-seed Haversine (always local)

import type { EnrichmentResult, EnrichmentFailure } from "./types";
import { reverseGeocode as kakaoReverse } from "./kakao";
import { lookup as vworldLookup } from "./vworld";
import { getYearlyGenHours } from "./pvgis";
import { inferSiteType as heuristicSiteType } from "./siteTypeHeuristic";
import { findNearest } from "./substation";

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

  const [kakaoResult, vworldResult, pvgisResult] = await Promise.allSettled([
    kakaoReverse(lat, lng),
    vworldLookup(lat, lng),
    getYearlyGenHours(lat, lng),
  ]);

  // -- Address: Kakao primary, VWorld fallback ---------------------------
  if (kakaoResult.status === "fulfilled") {
    result.address = kakaoResult.value;
  } else {
    failures.push({
      step: "reverse-geocode",
      error: errorMessage(kakaoResult.reason),
    });
  }
  if (
    !result.address &&
    vworldResult.status === "fulfilled" &&
    vworldResult.value
  ) {
    result.address = vworldResult.value.address;
  }

  // -- Irradiance --------------------------------------------------------
  if (pvgisResult.status === "fulfilled") {
    result.irradiance = pvgisResult.value;
  } else {
    failures.push({ step: "pvgis", error: errorMessage(pvgisResult.reason) });
  }

  // -- Site type: VWorld level5 first, address heuristic fallback --------
  if (vworldResult.status === "fulfilled" && vworldResult.value) {
    result.siteTypeHint = vworldResult.value.siteType;
  } else if (result.address) {
    try {
      result.siteTypeHint = heuristicSiteType(result.address.address);
    } catch (e) {
      failures.push({ step: "site-type", error: errorMessage(e) });
    }
  } else {
    failures.push({
      step: "site-type",
      error: "skipped — no address available",
    });
  }

  // -- Nearest substation (always local) ---------------------------------
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
