// /lib/location/pvgis.ts
// PVGIS lookup. Real call goes through /api/location/pvgis (server-only),
// which itself is gated by ENABLE_PVGIS_REAL=true. Falls back to the mock
// estimator when the proxy returns 503.

import type { PvgisResult } from "./types";
import { mockPvgis } from "./mocks";

interface PvgisFixedTotals {
  E_y: number; // annual energy yield (kWh/kWp/year)
  H_y?: number; // annual irradiation, plain key (some PVGIS versions)
  // PVGIS uses literal "H(i)_y" with parentheses as a JSON key.
  "H(i)_y"?: number;
}

interface PvgisFixedMonth {
  month: number;
  E_m: number; // monthly yield (kWh/kWp)
  H_d?: number;
}

interface PvgisCalcResponse {
  outputs?: {
    totals?: { fixed?: PvgisFixedTotals };
    monthly?: { fixed?: PvgisFixedMonth[] };
  };
}

const PR_BASELINE = 0.85;

async function fetchReal(
  lat: number,
  lng: number,
): Promise<PvgisCalcResponse | null> {
  try {
    const r = await fetch(`/api/location/pvgis?lat=${lat}&lng=${lng}`);
    if (!r.ok) return null;
    return (await r.json()) as PvgisCalcResponse;
  } catch (e) {
    if (typeof console !== "undefined") console.warn("[pvgis] fetch error", e);
    return null;
  }
}

function buildResult(
  lat: number,
  lng: number,
  data: PvgisCalcResponse,
): PvgisResult | null {
  const fixed = data.outputs?.totals?.fixed;
  if (!fixed) return null;
  const annualKwhPerKw = fixed.E_y;
  const annualIrradiation = fixed["H(i)_y"] ?? fixed.H_y;
  const peakSunHours = annualKwhPerKw / 365 / PR_BASELINE;
  const derivedPR =
    annualIrradiation && annualIrradiation > 0
      ? +(annualKwhPerKw / annualIrradiation).toFixed(3)
      : undefined;
  const monthly = data.outputs?.monthly?.fixed;
  return {
    lat,
    lng,
    annualKwhPerKw: Math.round(annualKwhPerKw),
    peakSunHours: +peakSunHours.toFixed(2),
    ...(annualIrradiation !== undefined
      ? { annualIrradiationKwhPerM2: Math.round(annualIrradiation) }
      : {}),
    ...(derivedPR !== undefined ? { derivedPR } : {}),
    ...(monthly
      ? {
          monthlyProduction: monthly.map((m) => ({
            month: m.month,
            kwhPerKw: +m.E_m.toFixed(1),
          })),
        }
      : {}),
    sourceMeta: {
      source: "real",
      confidence: "high",
      notes: "PVGIS PVcalc API (loss=14, fixed-tilt)",
    },
  };
}

export async function getYearlyGenHours(
  lat: number,
  lng: number,
): Promise<PvgisResult> {
  const data = await fetchReal(lat, lng);
  if (data) {
    const built = buildResult(lat, lng, data);
    if (built) return built;
  }
  return mockPvgis(lat, lng);
}

export async function getMonthlyProduction(
  lat: number,
  lng: number,
  capacityKw: number,
): Promise<PvgisResult> {
  void capacityKw;
  const data = await fetchReal(lat, lng);
  if (data) {
    const built = buildResult(lat, lng, data);
    if (built) return built;
  }
  // mock + synthetic monthly
  const yearly = mockPvgis(lat, lng);
  const monthlyProduction = Array.from({ length: 12 }, (_, i) => {
    const seasonal = 1 + 0.25 * Math.cos(((i - 5) * Math.PI) / 6);
    return {
      month: i + 1,
      kwhPerKw: +((yearly.annualKwhPerKw / 12) * seasonal).toFixed(1),
    };
  });
  return { ...yearly, monthlyProduction };
}
