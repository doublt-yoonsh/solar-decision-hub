// /lib/location/substation.ts
// Nearest-substation lookup using the seed GeoJSON in /lib/data/substations.json.
// 50km cap (per project decision): when no substation is within 50km, we report
// `fallbackUsed: true` and surface the regional default — the UI then shows a
// "(권역 평균 사용)" badge.

import { substations } from "../data";
import type { GridSystem } from "../types/PlantLocation";
import type { NearestSubstationResult } from "./types";

const FALLBACK_DISTANCE_KM = 50;

/**
 * Haversine great-circle distance in km between two WGS84 coordinates.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // mean Earth radius (km)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.asin(Math.sqrt(a));
}

interface SubstationFeature {
  type: string;
  properties: {
    name: string;
    voltageKv: number;
    grid: string;
    region: string;
  };
  geometry: { type: string; coordinates: number[] };
}

/**
 * Find the closest substation to a coordinate. If the closest is beyond
 * `FALLBACK_DISTANCE_KM`, mark `fallbackUsed: true` and downgrade confidence.
 *
 * Note: source is 'fallback' even when matched — substations.json is a 12-seed
 * subset, so any single match is a partial truth until v1.x boosts the dataset.
 */
export function findNearest(
  lat: number,
  lng: number,
): NearestSubstationResult {
  const features = (substations as { features: SubstationFeature[] }).features;
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < features.length; i++) {
    const f = features[i]!;
    const fx = f.geometry.coordinates[0]!;
    const fy = f.geometry.coordinates[1]!;
    const d = haversineKm(lat, lng, fy, fx);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  const best = features[bestIdx]!;
  const distanceKm = +bestDist.toFixed(1);
  const fallbackUsed = distanceKm > FALLBACK_DISTANCE_KM;

  return {
    name: best.properties.name,
    voltageKv: best.properties.voltageKv,
    grid: (best.properties.grid as GridSystem) ?? "main",
    region: best.properties.region,
    distanceKm,
    fallbackUsed,
    sourceMeta: {
      // 50km 이내 매칭은 실제 변전소 nearest 결과이므로 'real'.
      // 50km 초과 시에만 진짜 폴백(권역 평균)으로 'fallback' 처리.
      source: fallbackUsed ? "fallback" : "real",
      confidence: fallbackUsed ? "low" : "medium",
      notes: fallbackUsed
        ? `최근접 ${distanceKm}km — 50km 초과, 권역 평균으로 폴백`
        : `한전 변전소 시드 12개 중 최근접 매칭 (${distanceKm}km · 600+ 풀데이터는 v1.x)`,
    },
  };
}
