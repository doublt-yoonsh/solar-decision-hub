// /lib/location/vworld.ts
// Client-side wrapper for the VWorld address service via /api/location/vworld.
//
// VWorld's address response is special — its `level5` field (e.g. "산31임")
// ends with a single character that denotes the cadastral land use:
//   임 = 임야 (forest)        →  SiteType: 'forest'
//   전 = 밭                   →  'general'
//   답 = 논                   →  'general'
//   과 = 과수원               →  'general'
//   대 = 대지                 →  'building'
//   하/구/제 = 하천/구거/제방 →  'water'
//
// We extract this in a single network call and return both the address and
// the SiteTypeHint, so the enrichment pipeline doesn't need two round-trips.

import type { SiteType } from "../types/PlantInput";
import type { ReverseGeocodingResult, SiteTypeHint } from "./types";

interface VWorldStructure {
  level0: string;
  level1: string;
  level2: string;
  level3: string;
  level4L: string;
  level4LC: string;
  level4A: string;
  level4AC: string;
  level5: string;
  detail: string;
}

interface VWorldAddressResult {
  type: string;
  text: string;
  structure: VWorldStructure;
  zipcode?: string;
}

interface VWorldAddressResponse {
  response: {
    status: "OK" | "NOT_FOUND" | "ERROR";
    result?: VWorldAddressResult[];
    error?: { code: string; text: string };
  };
}

export interface VWorldLookup {
  address: ReverseGeocodingResult;
  siteType: SiteTypeHint;
}

async function tryFetch(url: string): Promise<VWorldAddressResponse | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) {
      if (typeof console !== "undefined") {
        console.warn(`[vworld] proxy ${r.status}`);
      }
      return null;
    }
    return (await r.json()) as VWorldAddressResponse;
  } catch (e) {
    if (typeof console !== "undefined") console.warn("[vworld] fetch error", e);
    return null;
  }
}

interface LandUseMapping {
  type: SiteType;
  confidence: SiteTypeHint["confidence"];
  label: string;
}

function mapLandUseChar(char: string): LandUseMapping {
  switch (char) {
    case "임":
      return { type: "forest", confidence: "high", label: "임야" };
    case "전":
      return { type: "general", confidence: "high", label: "전(밭)" };
    case "답":
      return { type: "general", confidence: "high", label: "답(논)" };
    case "과":
      return { type: "general", confidence: "high", label: "과수원" };
    case "목":
      return { type: "general", confidence: "medium", label: "목장용지" };
    case "대":
      return { type: "building", confidence: "medium", label: "대지" };
    case "하":
    case "구":
    case "제":
      return { type: "water", confidence: "medium", label: "하천/구거/제방" };
    case "잡":
      return { type: "general", confidence: "low", label: "잡종지" };
    default:
      return {
        type: "general",
        confidence: "low",
        label: `기타("${char}")`,
      };
  }
}

/**
 * Reverse geocode + extract site type from VWorld in one call.
 * Returns null if VWorld is unreachable, returned an error, or has no match.
 */
export async function lookup(
  lat: number,
  lng: number,
): Promise<VWorldLookup | null> {
  const data = await tryFetch(
    `/api/location/vworld?action=address&x=${lng}&y=${lat}`,
  );
  if (!data) return null;
  if (data.response.status !== "OK") return null;
  const first = data.response.result?.[0];
  if (!first) return null;

  const s = first.structure;
  const address: ReverseGeocodingResult = {
    lat,
    lng,
    address: first.text,
    addressType:
      first.type === "parcel"
        ? "jibun"
        : first.type === "road"
          ? "road"
          : "unknown",
    region: {
      sido: s.level1,
      sigungu: s.level2,
      eupmyeondong: s.level4L || s.level4A || s.level3 || undefined,
    },
    sourceMeta: {
      source: "real",
      confidence: "high",
      notes: "VWorld address API",
    },
  };

  const lastChar = s.level5.slice(-1);
  const m = mapLandUseChar(lastChar);
  const siteType: SiteTypeHint = {
    inferred: m.type,
    confidence: m.confidence,
    reason: `VWorld level5 "${s.level5}" 끝글자 → ${m.label}`,
    sourceMeta: {
      source: "real",
      confidence: m.confidence,
      notes: "VWorld land-type from level5",
    },
  };

  return { address, siteType };
}
