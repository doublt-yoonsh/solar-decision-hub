"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchAddress } from "@/lib/location/kakao";
import type { GeocodingResult, DataSource } from "@/lib/location/types";

export interface AddressSearchProps {
  onSelect: (lat: number, lng: number, address: string) => void;
}

function SourceBadge({ source }: { source: DataSource }) {
  const tone =
    source === "real"
      ? "bg-emerald-100 text-emerald-800"
      : source === "mock"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";
  return (
    <span className={`text-[10px] uppercase rounded px-1.5 py-0.5 ${tone}`}>
      {source}
    </span>
  );
}

/**
 * Address text → coordinate picker.
 * Uses Kakao Local search via /api/location/kakao (real or mock fallback).
 */
export function AddressSearch({ onSelect }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GeocodingResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    try {
      const r = await searchAddress(q);
      setResult(r);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="예: 전라남도 영광군 백수읍 백수해안로 1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? "검색 중..." : "검색"}
        </Button>
      </form>

      {result && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{result.matches.length}건 검색됨</span>
            <SourceBadge source={result.sourceMeta.source} />
          </div>
          {result.matches.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              결과가 없습니다. 다른 키워드로 검색해보세요.
            </p>
          ) : (
            <div className="border rounded-md divide-y max-h-72 overflow-auto">
              {result.matches.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect(m.lat, m.lng, m.address)}
                  className="w-full text-left p-3 hover:bg-accent text-sm"
                >
                  <p className="font-medium">{m.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.region.sido} {m.region.sigungu}
                    {m.region.eupmyeondong ? ` ${m.region.eupmyeondong}` : ""}
                    {" · "}
                    ({m.lat.toFixed(4)}, {m.lng.toFixed(4)})
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
