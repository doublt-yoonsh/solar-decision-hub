// /lib/location/supplyZone.ts
// Client wrapper for /api/location/supply-zone.
// Uses KEPCO 지역별 공급가능 변전소 정보 (data.go.kr 15128065) to map
// (sido, sigungu, eupmyeondong) → KEPCO supply-zone code (e.g. "당*"),
// then narrows OSM substations whose name starts with the same prefix
// and lie within 50km — those are the realistic connection candidates.

import type { SourceMeta } from "./types";

export interface SupplyZoneCandidate {
  name: string;
  voltageKv: number;
  distanceKm: number;
}

export interface SupplyZoneResult {
  /** Anonymized supply-zone code from KEPCO, e.g. "당*". */
  code: string;
  /** Korean prefix character — used to narrow OSM substations. */
  prefix: string;
  matchedRegion: {
    sido: string;
    sigungu: string;
    eupmyeondong: string;
  };
  /** OSM substations starting with `prefix` and within 50km, sorted by distance. */
  candidateSubstations: SupplyZoneCandidate[];
  /** A few other regions in the same zone — useful for context. */
  sameZoneSampleRegions: string[];
  sourceMeta: SourceMeta;
}

export async function lookupSupplyZone(
  sido: string | undefined,
  sigungu: string | undefined,
  eupmyeondong: string | undefined,
  lat: number,
  lng: number,
): Promise<SupplyZoneResult | null> {
  if (!sigungu) return null;
  try {
    const params = new URLSearchParams({
      sido: sido ?? "",
      sigungu,
      eupmyeondong: eupmyeondong ?? "",
      lat: String(lat),
      lng: String(lng),
    });
    const r = await fetch(`/api/location/supply-zone?${params.toString()}`);
    if (!r.ok) return null;
    const body = (await r.json()) as Omit<SupplyZoneResult, "sourceMeta">;
    return {
      ...body,
      sourceMeta: {
        source: "real",
        confidence:
          body.candidateSubstations.length > 0 ? "high" : "medium",
        notes:
          "KEPCO 지역별 공급가능 변전소 정보 (비식별 코드) + OSM 변전소 prefix 매칭",
      },
    };
  } catch (e) {
    if (typeof console !== "undefined")
      console.warn("[supplyZone] fetch error", e);
    return null;
  }
}
