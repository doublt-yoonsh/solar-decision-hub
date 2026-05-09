// /lib/location/kakao.ts
// Thin client over Kakao Local API.
// Mock-first: when no API key is present we return mock fixtures with
// sourceMeta.source === 'mock', so the entire app remains usable offline.
// Real call wiring (server-side proxy, signed fetch) lands in Phase 2B.

import type { GeocodingResult, ReverseGeocodingResult } from "./types";
import { mockKakaoAddress, mockReverseGeocode } from "./mocks";

/** Detect whether either Kakao key is configured. */
function hasApiKey(): boolean {
  if (typeof process === "undefined") return false;
  const env = process.env;
  return !!(env.KAKAO_REST_API_KEY || env.NEXT_PUBLIC_KAKAO_JS_KEY);
}

/**
 * Forward geocoding (text → coordinates).
 * Phase 2A: mock-only branch.
 * Phase 2B: real call routed through `/app/api/kakao/search`.
 */
export async function searchAddress(query: string): Promise<GeocodingResult> {
  if (!hasApiKey()) {
    if (typeof console !== "undefined") {
      console.warn(
        "[kakao] No API key configured — falling back to mock fixtures.",
      );
    }
    return mockKakaoAddress(query);
  }
  // Phase 2B placeholder — currently still mock until route is wired up.
  return mockKakaoAddress(query);
}

/**
 * Reverse geocoding (coordinates → address).
 * Phase 2A: mock-only branch.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodingResult> {
  if (!hasApiKey()) {
    if (typeof console !== "undefined") {
      console.warn(
        "[kakao] No API key configured — falling back to mock fixtures.",
      );
    }
    return mockReverseGeocode(lat, lng);
  }
  // Phase 2B placeholder.
  return mockReverseGeocode(lat, lng);
}
