// /lib/location/pvgis.ts
// PVGIS lookup — real call requires no API key but we still gate it behind
// `ENABLE_PVGIS_REAL=true` so v1 demos don't depend on a live EU JRC endpoint.

import type { PvgisResult } from "./types";
import { mockPvgis } from "./mocks";

/** When to call the real PVGIS endpoint vs mock. */
function shouldUseReal(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.ENABLE_PVGIS_REAL === "true";
}

/**
 * Annual generation hours / annualKwhPerKw for a given coordinate.
 * Mock by default — Phase 2B implements the real `re.jrc.ec.europa.eu/api/v5_2` call.
 */
export async function getYearlyGenHours(
  lat: number,
  lng: number,
): Promise<PvgisResult> {
  if (!shouldUseReal()) {
    return mockPvgis(lat, lng);
  }
  // Phase 2B real call — same shape, sourceMeta.source: 'real'.
  return mockPvgis(lat, lng);
}

/**
 * Same as `getYearlyGenHours` but with a 12-month synthetic seasonal curve.
 * The real PVGIS endpoint returns this directly; mock approximates with a
 * cosine peaking in June (Northern Hemisphere).
 */
export async function getMonthlyProduction(
  lat: number,
  lng: number,
  capacityKw: number,
): Promise<PvgisResult> {
  void capacityKw; // Reserved for Phase 2B (real call uses peakpower param).
  const base = await getYearlyGenHours(lat, lng);
  const monthlyProduction = Array.from({ length: 12 }, (_, i) => {
    const seasonal = 1 + 0.25 * Math.cos(((i - 5) * Math.PI) / 6);
    const kwhPerKw = +((base.annualKwhPerKw / 12) * seasonal).toFixed(1);
    return { month: i + 1, kwhPerKw };
  });
  return { ...base, monthlyProduction };
}
