// /lib/location/mocks.ts
// Mock implementations used when no external API is configured.
// All return values carry sourceMeta.source === 'mock' so the UI can
// render a clear "mock 모드" badge.

import type {
  GeocodingResult,
  ReverseGeocodingResult,
  PvgisResult,
  AddressRegion,
} from "./types";

interface MockFixture {
  keyword: string;
  address: string;
  lat: number;
  lng: number;
  region: AddressRegion;
}

const MOCK_FIXTURES: readonly MockFixture[] = [
  {
    keyword: "서울",
    address: "서울특별시 중구 세종대로 110",
    lat: 37.5665,
    lng: 126.978,
    region: { sido: "서울특별시", sigungu: "중구", eupmyeondong: "태평로1가" },
  },
  {
    keyword: "영광",
    address: "전라남도 영광군 백수읍 백수해안로 1",
    lat: 35.2773,
    lng: 126.4181,
    region: { sido: "전라남도", sigungu: "영광군", eupmyeondong: "백수읍" },
  },
  {
    keyword: "제주",
    address: "제주특별자치도 제주시 첨단로 242",
    lat: 33.4996,
    lng: 126.5312,
    region: {
      sido: "제주특별자치도",
      sigungu: "제주시",
      eupmyeondong: "아라동",
    },
  },
  {
    keyword: "당진",
    address: "충청남도 당진시 송산면 송산로 100",
    lat: 36.8893,
    lng: 126.6286,
    region: { sido: "충청남도", sigungu: "당진시", eupmyeondong: "송산면" },
  },
  {
    keyword: "경주",
    address: "경상북도 경주시 산내면 의곡길 50",
    lat: 35.7858,
    lng: 129.2231,
    region: { sido: "경상북도", sigungu: "경주시", eupmyeondong: "산내면" },
  },
];

const MOCK_NOTE = "API 키 없음 — mock 모드";

function defaultFixture(): MockFixture {
  return MOCK_FIXTURES[0]!;
}

/**
 * Approximate forward geocoding from a free-text query.
 * Matches against fixture keyword OR substring of full address.
 * Falls back to fixture[0] when nothing matches (so the UI never empties).
 */
export function mockKakaoAddress(query: string): GeocodingResult {
  const trimmed = query.trim();
  const matched = MOCK_FIXTURES.filter(
    (f) =>
      f.keyword.includes(trimmed) ||
      f.address.includes(trimmed) ||
      trimmed.includes(f.keyword),
  );

  const matches = (matched.length > 0 ? matched : [defaultFixture()]).map(
    (f) => ({
      address: f.address,
      addressType: "road" as const,
      lat: f.lat,
      lng: f.lng,
      region: f.region,
    }),
  );

  return {
    query: trimmed,
    matches,
    sourceMeta: {
      source: "mock",
      confidence: matched.length > 0 ? "medium" : "low",
      notes: MOCK_NOTE,
    },
  };
}

/**
 * Approximate reverse geocoding by Euclidean nearest fixture (sufficient for
 * Korea's small lat/lng span in mock mode).
 */
export function mockReverseGeocode(
  lat: number,
  lng: number,
): ReverseGeocodingResult {
  let best: { f: MockFixture; d: number } | null = null;
  for (const f of MOCK_FIXTURES) {
    const d = Math.hypot(f.lat - lat, f.lng - lng);
    if (!best || d < best.d) best = { f, d };
  }
  const fx = best?.f ?? defaultFixture();
  return {
    lat,
    lng,
    address: fx.address,
    addressType: "road",
    region: fx.region,
    sourceMeta: { source: "mock", confidence: "low", notes: MOCK_NOTE },
  };
}

/**
 * Mock PVGIS — produces a plausible irradiance estimate by latitude.
 * Korea spans 33–38°N: 33° → 4.2 PSH, 38° → 3.5 PSH. System factor 0.85.
 * Verified against regionDefaults.json baseline.
 */
export function mockPvgis(lat: number, lng: number): PvgisResult {
  const latClamped = Math.max(33, Math.min(38, lat));
  const peakSunHours = +(
    4.2 -
    ((latClamped - 33) * (4.2 - 3.5)) / (38 - 33)
  ).toFixed(2);
  const annualKwhPerKw = Math.round(peakSunHours * 365 * 0.85);

  return {
    lat,
    lng,
    annualKwhPerKw,
    peakSunHours,
    sourceMeta: {
      source: "mock",
      confidence: "medium",
      notes: "PVGIS mock — 위도 기반 선형 추정 (33–38°N)",
    },
  };
}
