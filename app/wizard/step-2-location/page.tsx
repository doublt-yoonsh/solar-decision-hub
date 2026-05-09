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
  CoordinateInput,
  type Coordinates,
} from "@/components/location/CoordinateInput";
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
            좌표를 입력하면 자동으로 주소·일사량·부지·변전소를 매핑합니다 (mock 모드)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CoordinateInput onSubmit={run} />
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
            {result.nearestSubstation && (
              <p className="flex flex-wrap gap-2 items-baseline">
                <span className="text-muted-foreground">최근접 변전소:</span>
                <span>
                  {result.nearestSubstation.name} (
                  {result.nearestSubstation.distanceKm}km
                  {result.nearestSubstation.fallbackUsed &&
                    " · 권역 평균 사용"}
                  )
                </span>
                <SourceBadge
                  source={result.nearestSubstation.sourceMeta.source}
                />
              </p>
            )}
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
