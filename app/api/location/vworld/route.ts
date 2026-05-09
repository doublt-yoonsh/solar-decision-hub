import { NextResponse } from "next/server";

// Server-side proxy for VWorld API.
// VWORLD_API_KEY never leaves the server. We currently use only the address
// service (the data service requires extra console permission).

export async function GET(request: Request) {
  const apiKey = process.env.VWORLD_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "VWORLD_API_KEY not configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action !== "address") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  const x = url.searchParams.get("x");
  const y = url.searchParams.get("y");
  if (!x || !y) {
    return NextResponse.json({ error: "missing x/y" }, { status: 400 });
  }

  const endpoint =
    `http://api.vworld.kr/req/address?service=address&request=getAddress&version=2.0` +
    `&crs=epsg:4326&point=${x},${y}&format=json&type=both&key=${apiKey}`;

  try {
    const r = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      return NextResponse.json(
        { error: "vworld_upstream", status: r.status },
        { status: 502 },
      );
    }
    const data = await r.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "vworld_fetch_error", message: msg },
      { status: 504 },
    );
  }
}
