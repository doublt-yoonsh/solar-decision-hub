import { NextResponse } from "next/server";

// Server-side proxy for Kakao Local API.
// Browser → /api/location/kakao?action=... → Kakao
// KAKAO_REST_API_KEY never leaves the server.

const KAKAO_BASE = "https://dapi.kakao.com/v2/local";

export async function GET(request: Request) {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY not configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  let endpoint: string;
  if (action === "search") {
    const query = url.searchParams.get("query");
    if (!query) {
      return NextResponse.json({ error: "missing query" }, { status: 400 });
    }
    endpoint = `${KAKAO_BASE}/search/address.json?query=${encodeURIComponent(query)}`;
  } else if (action === "reverse") {
    const x = url.searchParams.get("x");
    const y = url.searchParams.get("y");
    if (!x || !y) {
      return NextResponse.json({ error: "missing x/y" }, { status: 400 });
    }
    endpoint = `${KAKAO_BASE}/geo/coord2address.json?x=${x}&y=${y}`;
  } else {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  try {
    const r = await fetch(endpoint, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: "kakao_upstream", status: r.status },
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
      { error: "kakao_fetch_error", message: msg },
      { status: 504 },
    );
  }
}
