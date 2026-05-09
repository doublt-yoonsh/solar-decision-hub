"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CoordinateInput,
  type Coordinates,
} from "@/components/location/CoordinateInput";
import { AddressSearch } from "@/components/location/AddressSearch";
import { enrich } from "@/lib/location/enrich";
import type { EnrichmentResult, DataSource } from "@/lib/location/types";
import { useWizardStore } from "@/lib/store/wizard";

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

export default function Step2Page() {
  const router = useRouter();
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [loading, setLoading] = useState(false);

  const updatePlant = useWizardStore((s) => s.updatePlant);
  const activePlant = useWizardStore(
    (s) => s.plants[s.activePlantIndex],
  );
  const setStep = useWizardStore((s) => s.setStep);

  const run = async (coords: Coordinates) => {
    setLoading(true);
    try {
      const res = await enrich(coords.lat, coords.lng);
      setResult(res);
      if (res.address) {
        updatePlant({
          id: activePlant?.id ?? `plant-${Date.now()}`,
          location: {
            address: res.address.address,
            lat: res.lat,
            lng: res.lng,
            region: res.address.region,
            ...(res.nearestSubstation
              ? {
                  nearestSubstation: {
                    name: res.nearestSubstation.name,
                    distanceKm: res.nearestSubstation.distanceKm,
                    grid: res.nearestSubstation.grid,
                  },
                }
              : {}),
            ...(res.irradiance
              ? {
                  solarIrradiance: {
                    annualKwhPerKw: res.irradiance.annualKwhPerKw,
                    peakSunHours: res.irradiance.peakSunHours,
                    ...(res.irradiance.derivedPR !== undefined
                      ? { derivedPR: res.irradiance.derivedPR }
                      : {}),
                    source:
                      res.irradiance.sourceMeta.source === "real"
                        ? "pvgis"
                        : "user-estimate",
                  },
                }
              : {}),
          },
          ...(res.siteTypeHint
            ? { siteType: res.siteTypeHint.inferred }
            : {}),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!result?.address) return;
    setStep(3);
    router.push("/wizard/step-3-equipment");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>발전소 위치</CardTitle>
          <CardDescription>
            주소 검색이 가장 편합니다. 좌표를 정확히 알면 직접 입력도 가능.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="address">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="address">주소 검색</TabsTrigger>
              <TabsTrigger value="coords">좌표 직접 입력</TabsTrigger>
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
          {loading && (
            <p className="mt-3 text-sm text-muted-foreground">처리 중...</p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">자동 매핑 결과</CardTitle>
            <CardDescription>
              모든 자동 추정값은 다음 단계에서 수정 가능합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result.address && (
              <p className="flex flex-wrap gap-2 items-baseline">
                <span className="text-muted-foreground">주소:</span>
                <span>{result.address.address}</span>
                <SourceBadge source={result.address.sourceMeta.source} />
              </p>
            )}
            {result.irradiance && (
              <p className="flex flex-wrap gap-2 items-baseline">
                <span className="text-muted-foreground">일사량:</span>
                <span>
                  {result.irradiance.annualKwhPerKw} kWh/kWp/yr ·{" "}
                  {result.irradiance.peakSunHours} h/day
                </span>
                <SourceBadge source={result.irradiance.sourceMeta.source} />
              </p>
            )}
            {result.siteTypeHint && (
              <p className="flex flex-wrap gap-2 items-baseline">
                <span className="text-muted-foreground">부지 추정:</span>
                <span>
                  {result.siteTypeHint.inferred} (신뢰도{" "}
                  {result.siteTypeHint.confidence})
                </span>
                <SourceBadge source={result.siteTypeHint.sourceMeta.source} />
              </p>
            )}
            {result.supplyZone ? (
              <div className="space-y-1">
                <p className="flex flex-wrap gap-2 items-baseline">
                  <span className="text-muted-foreground">접속 변전소 후보 (한전):</span>
                  <span className="font-medium">{result.supplyZone.code}</span>
                  <SourceBadge
                    source={result.supplyZone.sourceMeta.source}
                  />
                </p>
                {result.supplyZone.candidateSubstations.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {result.supplyZone.candidateSubstations
                      .map(
                        (c) =>
                          `${c.name} (${c.distanceKm}km, ${c.voltageKv}kV)`,
                      )
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    OSM 변전소 중 매칭되는 후보 없음 (50km 이내 미존재)
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  ※ 한전 비식별 코드. 실제 접속 변전소는 분산형전원 신청 결과에 따라 다릅니다.
                </p>
              </div>
            ) : result.nearestSubstation ? (
              <p className="flex flex-wrap gap-2 items-baseline">
                <span className="text-muted-foreground">최근접 변전소 (OSM 거리, 한전 권역 미매칭 폴백):</span>
                <span>
                  {result.nearestSubstation.name} (
                  {result.nearestSubstation.distanceKm}km)
                </span>
                <SourceBadge
                  source={result.nearestSubstation.sourceMeta.source}
                />
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          ← 뒤로
        </Button>
        <Button onClick={handleNext} disabled={!result?.address}>
          다음 →
        </Button>
      </div>
    </div>
  );
}
