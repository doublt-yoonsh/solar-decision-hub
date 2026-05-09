// /lib/location/kakao.ts
// Client-side wrapper that calls /api/location/kakao (server proxy).
// Falls back to mock fixtures when the proxy returns 503 (no API key) or
// any network error — so the app stays usable offline.

import type { GeocodingResult, ReverseGeocodingResult } from "./types";
import { mockKakaoAddress, mockReverseGeocode } from "./mocks";

interface KakaoSearchDoc {
  address_name: string;
  x: string;
  y: string;
  road_address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    building_name?: string;
  } | null;
  address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
  } | null;
}

interface KakaoSearchResponse {
  documents: KakaoSearchDoc[];
}

interface KakaoReverseDoc {
  road_address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    building_name?: string;
  } | null;
  address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    mountain_yn?: string;
  } | null;
}

interface KakaoReverseResponse {
  documents: KakaoReverseDoc[];
}

async function tryFetch<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) {
      if (typeof console !== "undefined") {
        console.warn(`[kakao] proxy ${r.status}`);
      }
      return null;
    }
    return (await r.json()) as T;
  } catch (e) {
    if (typeof console !== "undefined") console.warn("[kakao] fetch error", e);
    return null;
  }
}

export async function searchAddress(query: string): Promise<GeocodingResult> {
  const data = await tryFetch<KakaoSearchResponse>(
    `/api/location/kakao?action=search&query=${encodeURIComponent(query)}`,
  );
  if (!data) return mockKakaoAddress(query);

  const matches = data.documents.map((doc) => {
    const lat = parseFloat(doc.y);
    const lng = parseFloat(doc.x);
    const road = doc.road_address;
    const jibun = doc.address;
    return {
      address: doc.address_name,
      addressType: (road
        ? "road"
        : jibun
          ? "jibun"
          : "unknown") as "road" | "jibun" | "unknown",
      lat,
      lng,
      region: {
        sido:
          road?.region_1depth_name ?? jibun?.region_1depth_name ?? "",
        sigungu:
          road?.region_2depth_name ?? jibun?.region_2depth_name ?? "",
        eupmyeondong:
          road?.region_3depth_name ?? jibun?.region_3depth_name ?? undefined,
      },
      ...(road?.building_name ? { buildingName: road.building_name } : {}),
    };
  });

  return {
    query,
    matches: matches.length > 0 ? matches : mockKakaoAddress(query).matches,
    sourceMeta: {
      source: matches.length > 0 ? "real" : "fallback",
      confidence: matches.length > 0 ? "high" : "low",
      notes: "Kakao Local API",
    },
  };
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodingResult> {
  const data = await tryFetch<KakaoReverseResponse>(
    `/api/location/kakao?action=reverse&x=${lng}&y=${lat}`,
  );
  if (!data) return mockReverseGeocode(lat, lng);

  const doc = data.documents[0];
  if (!doc) {
    return {
      lat,
      lng,
      address: "주소를 찾을 수 없음",
      addressType: "unknown",
      region: { sido: "", sigungu: "" },
      sourceMeta: {
        source: "real",
        confidence: "low",
        notes: "Kakao 매칭 없음",
      },
    };
  }

  const road = doc.road_address;
  const jibun = doc.address;
  const primary = road ?? jibun;

  return {
    lat,
    lng,
    address: primary?.address_name ?? "",
    addressType: road ? "road" : jibun ? "jibun" : "unknown",
    region: {
      sido: primary?.region_1depth_name ?? "",
      sigungu: primary?.region_2depth_name ?? "",
      eupmyeondong: primary?.region_3depth_name ?? undefined,
    },
    ...(road?.building_name ? { buildingName: road.building_name } : {}),
    sourceMeta: {
      source: "real",
      confidence: "high",
      notes: "Kakao Local API (coord2address)",
    },
  };
}
