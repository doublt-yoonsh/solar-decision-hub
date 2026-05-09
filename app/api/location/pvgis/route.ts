import { NextResponse } from "next/server";

// Server-side proxy for PVGIS (EU JRC).
// No API key required, but we gate calls behind ENABLE_PVGIS_REAL=true so the
// client can fall back to a mock estimator when disabled.

export async function GET(request: Request) {
  if (process.env.ENABLE_PVGIS_REAL !== "true") {
    return NextResponse.json(
      { error: "pvgis disabled (set ENABLE_PVGIS_REAL=true)" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  if (!lat || !lng) {
    return NextResponse.json({ error: "missing lat/lng" }, { status: 400 });
  }

  // PVcalc — annual + monthly fixed-tilt PV simulation.
  // peakpower=1 (per-kW), loss=14 (default system losses), pvtechchoice=crystSi.
  const endpoint =
    `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc` +
    `?lat=${lat}&lon=${lng}&peakpower=1&loss=14&outputformat=json`;

  try {
    const r = await fetch(endpoint, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) {
      return NextResponse.json(
        { error: "pvgis_upstream", status: r.status },
        { status: 502 },
      );
    }
    const data = await r.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=2592000" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "pvgis_fetch_error", message: msg },
      { status: 504 },
    );
  }
}
