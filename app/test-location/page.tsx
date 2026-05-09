"use client";

import * as React from "react";

import {
  CoordinateInput,
  type Coordinates,
} from "@/components/location/CoordinateInput";
import { AddressSearch } from "@/components/location/AddressSearch";
import { enrich } from "@/lib/location/enrich";
import type {
  EnrichmentResult,
  DataSource,
} from "@/lib/location/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const PRESETS: ReadonlyArray<Coordinates & { label: string }> = [
  { label: "서울 (도심)", lat: 37.5665, lng: 126.978 },
  { label: "영광 (해안)", lat: 35.2773, lng: 126.4181 },
  { label: "제주 (jeju 그리드)", lat: 33.4996, lng: 126.5312 },
  { label: "당진 (충남)", lat: 36.8893, lng: 126.6286 },
  { label: "경주 산내면", lat: 35.7858, lng: 129.2231 },
];

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

export default function TestLocationPage() {
  const [result, setResult] = React.useState<EnrichmentResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  const run = React.useCallback(async (coords: Coordinates) => {
    setLoading(true);
    try {
      const res = await enrich(coords.lat, coords.lng);
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen p-6 sm:p-10 max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>위치 인리치 테스트</CardTitle>
          <CardDescription>
            주소 검색 또는 좌표 입력 → 카카오·VWorld·PVGIS 매핑 결과
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="address">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="address">주소 검색</TabsTrigger>
              <TabsTrigger value="coords">좌표 입력</TabsTrigger>
            </TabsList>
            <TabsContent value="address" className="pt-4">
              <AddressSearch
                onSelect={(lat, lng) => {
                  void run({ lat, lng });
                }}
              />
            </TabsContent>
            <TabsContent value="coords" className="pt-4">
              <CoordinateInput onSubmit={run} />
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground self-center">
              프리셋:
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  void run(p);
                }}
                className="text-xs rounded-md border px-2 py-1 hover:bg-accent"
              >
                {p.label}
              </button>
            ))}
          </div>
          {loading && (
            <p className="text-sm text-muted-foreground">계산 중...</p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>결과</CardTitle>
            <CardDescription>
              ({result.lat}, {result.lng}) · {result.computedAt}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="address">
              <TabsList>
                <TabsTrigger value="address">주소</TabsTrigger>
                <TabsTrigger value="irradiance">일사량</TabsTrigger>
                <TabsTrigger value="siteType">부지</TabsTrigger>
                <TabsTrigger value="substation">변전소</TabsTrigger>
                <TabsTrigger value="failures">실패</TabsTrigger>
              </TabsList>

              <TabsContent
                value="address"
                className="space-y-1 text-sm pt-2"
              >
                {result.address ? (
                  <>
                    <p className="flex gap-2 items-center">
                      {result.address.address}
                      <SourceBadge
                        source={result.address.sourceMeta.source}
                      />
                    </p>
                    <p className="text-muted-foreground">
                      {result.address.region.sido} /{" "}
                      {result.address.region.sigungu}
                      {result.address.region.eupmyeondong &&
                        ` / ${result.address.region.eupmyeondong}`}
                    </p>
                    {result.address.sourceMeta.notes && (
                      <p className="text-xs text-muted-foreground">
                        {result.address.sourceMeta.notes}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">데이터 없음</p>
                )}
              </TabsContent>

              <TabsContent
                value="irradiance"
                className="space-y-1 text-sm pt-2"
              >
                {result.irradiance ? (
                  <>
                    <p className="flex gap-2 items-center">
                      peakSunHours:{" "}
                      <strong>{result.irradiance.peakSunHours}</strong> h/day
                      <SourceBadge
                        source={result.irradiance.sourceMeta.source}
                      />
                    </p>
                    <p>
                      annualKwhPerKw:{" "}
                      <strong>{result.irradiance.annualKwhPerKw}</strong>{" "}
                      kWh/kWp/year
                    </p>
                    {result.irradiance.sourceMeta.notes && (
                      <p className="text-xs text-muted-foreground">
                        {result.irradiance.sourceMeta.notes}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">데이터 없음</p>
                )}
              </TabsContent>

              <TabsContent
                value="siteType"
                className="space-y-1 text-sm pt-2"
              >
                {result.siteTypeHint ? (
                  <>
                    <p className="flex gap-2 items-center">
                      추정 부지:{" "}
                      <strong>{result.siteTypeHint.inferred}</strong>{" "}
                      <span className="text-muted-foreground">
                        (신뢰도 {result.siteTypeHint.confidence})
                      </span>
                      <SourceBadge
                        source={result.siteTypeHint.sourceMeta.source}
                      />
                    </p>
                    <p className="text-muted-foreground">
                      규칙: {result.siteTypeHint.reason}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">데이터 없음</p>
                )}
              </TabsContent>

              <TabsContent
                value="substation"
                className="space-y-2 text-sm pt-2"
              >
                {result.supplyZone ? (
                  <div className="space-y-1">
                    <p className="text-xs uppercase text-muted-foreground">
                      한전 공급권역 (행정구역 기반)
                    </p>
                    <p className="flex gap-2 items-center">
                      코드: <strong>{result.supplyZone.code}</strong>
                      <SourceBadge
                        source={result.supplyZone.sourceMeta.source}
                      />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      매칭 행정구역: {result.supplyZone.matchedRegion.sido}{" "}
                      {result.supplyZone.matchedRegion.sigungu}{" "}
                      {result.supplyZone.matchedRegion.eupmyeondong}
                    </p>
                    {result.supplyZone.candidateSubstations.length > 0 ? (
                      <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
                        {result.supplyZone.candidateSubstations.map(
                          (c, i) => (
                            <li key={i}>
                              {c.name} — {c.distanceKm}km · {c.voltageKv}kV
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        OSM 변전소 중 매칭 후보 없음 (50km 이내 미존재)
                      </p>
                    )}
                    {result.supplyZone.sameZoneSampleRegions.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        같은 권역:{" "}
                        {result.supplyZone.sameZoneSampleRegions
                          .slice(0, 3)
                          .join(" · ")}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      ※ 한전 비식별 코드. 실제 접속 변전소는 분산형전원 신청 결과에 따라 다릅니다.
                    </p>
                  </div>
                ) : result.nearestSubstation ? (
                  <div className="space-y-1">
                    <p className="text-xs uppercase text-muted-foreground">
                      OSM 거리 nearest (한전 권역 미매칭 폴백)
                    </p>
                    <p className="flex gap-2 items-center">
                      <strong>{result.nearestSubstation.name}</strong>{" "}
                      <span className="text-muted-foreground">
                        ({result.nearestSubstation.voltageKv}kV ·{" "}
                        {result.nearestSubstation.grid})
                      </span>
                      <SourceBadge
                        source={result.nearestSubstation.sourceMeta.source}
                      />
                    </p>
                    <p className="text-muted-foreground text-xs">
                      거리: {result.nearestSubstation.distanceKm} km
                      {result.nearestSubstation.fallbackUsed &&
                        " ⚠️ (50km 초과 — 권역 평균 사용)"}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">데이터 없음</p>
                )}
              </TabsContent>

              <TabsContent
                value="failures"
                className="space-y-1 text-sm pt-2"
              >
                {result.partialFailures.length === 0 ? (
                  <p className="text-emerald-700">모든 단계 성공</p>
                ) : (
                  <ul className="list-disc list-inside text-muted-foreground">
                    {result.partialFailures.map((f, i) => (
                      <li key={i}>
                        <strong>{f.step}</strong>: {f.error}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
