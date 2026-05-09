import { NextResponse } from "next/server";

import supplyData from "@/lib/data/supplySubstations.json";
import substationsData from "@/lib/data/substations.json";

// Server route — KEPCO supply-zone lookup. The 657KB supply JSON stays on
// the server, never shipped to the browser bundle.
//
// Flow:
//   1. (sido, sigungu, eupmyeondong) → exact row in supply CSV
//   2. row.공급변전소 (e.g. "당*") → prefix character "당"
//   3. OSM substations whose name starts with that prefix AND within 50km
//   4. return code + candidates + same-zone other regions

interface SupplyRow {
  시도: string;
  시군구: string;
  읍면동: string;
  공급변전소: string;
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

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Strip suffixes so "충청남도" matches "충남" or "충청남도" loosely. */
function normalizeSido(s: string): string {
  return s
    .replace("특별자치도", "")
    .replace("특별자치시", "")
    .replace("특별시", "")
    .replace("광역시", "")
    .replace(/도$/, "")
    .replace(/시$/, "")
    .trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sido = url.searchParams.get("sido")?.trim() ?? "";
  const sigungu = url.searchParams.get("sigungu")?.trim() ?? "";
  const eupmyeondong = url.searchParams.get("eupmyeondong")?.trim() ?? "";
  const latStr = url.searchParams.get("lat");
  const lngStr = url.searchParams.get("lng");

  if (!sigungu || !latStr || !lngStr) {
    return NextResponse.json(
      { error: "missing required params (sigungu, lat, lng)" },
      { status: 400 },
    );
  }
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  const rows = (supplyData as { rows: SupplyRow[] }).rows;
  const sidoNorm = normalizeSido(sido);

  // Match priority: exact sigungu+eupmyeondong+sido > sigungu+eupmyeondong > sigungu
  let matches: SupplyRow[] = [];
  if (eupmyeondong) {
    matches = rows.filter(
      (r) =>
        r.시군구 === sigungu &&
        r.읍면동 === eupmyeondong &&
        (!sidoNorm || normalizeSido(r.시도).includes(sidoNorm)),
    );
    if (matches.length === 0) {
      matches = rows.filter(
        (r) => r.시군구 === sigungu && r.읍면동 === eupmyeondong,
      );
    }
  }
  if (matches.length === 0) {
    matches = rows.filter((r) => r.시군구 === sigungu);
  }
  if (matches.length === 0) {
    return NextResponse.json(
      { error: "no supply zone match for region" },
      { status: 404 },
    );
  }

  const match = matches[0]!;
  const code = match.공급변전소;
  const prefix = code.replace(/\*$/, "").charAt(0);

  const features = (substationsData as { features: SubstationFeature[] })
    .features;
  // Match strategy:
  //   1. Substation name *contains* the prefix character (e.g. "당" matches
  //      당진/신당진/북당진 — KEPCO often anonymizes by base district name).
  //   2. OR substation name contains the sigungu base (e.g. 시군구 "당진시"
  //      → "당진" — catches "신당진" / "북당진" even when prefix differs).
  //   3. Distance ≤ 50km.
  const sigunguBase = match.시군구.replace(/시$|군$|구$/, "");
  const candidates: Array<{
    name: string;
    voltageKv: number;
    distanceKm: number;
  }> = [];
  for (const f of features) {
    const name = f.properties.name;
    const prefixHit = !!prefix && name.includes(prefix);
    const sigunguHit = !!sigunguBase && name.includes(sigunguBase);
    if (!prefixHit && !sigunguHit) continue;
    const fx = f.geometry.coordinates[0]!;
    const fy = f.geometry.coordinates[1]!;
    const d = haversineKm(lat, lng, fy, fx);
    if (d > 50) continue;
    candidates.push({
      name,
      voltageKv: f.properties.voltageKv,
      distanceKm: +d.toFixed(1),
    });
  }
  // Dedup (a name may match both prefix and sigungu)
  const seen = new Set<string>();
  const dedup = candidates.filter((c) =>
    seen.has(c.name) ? false : (seen.add(c.name), true),
  );
  dedup.sort((a, b) => a.distanceKm - b.distanceKm);

  const sameZone = rows
    .filter((r) => r.공급변전소 === code)
    .slice(0, 5)
    .map((r) => `${r.시도} ${r.시군구} ${r.읍면동}`);

  return NextResponse.json(
    {
      code,
      prefix,
      matchedRegion: {
        sido: match.시도,
        sigungu: match.시군구,
        eupmyeondong: match.읍면동,
      },
      candidateSubstations: dedup.slice(0, 5),
      sameZoneSampleRegions: sameZone,
    },
    { headers: { "Cache-Control": "public, s-maxage=86400" } },
  );
}
