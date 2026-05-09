"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWizardStore } from "@/lib/store/wizard";
import type { SiteType } from "@/lib/types/PlantInput";
import { getWeight, capacityBand } from "@/lib/data";

const CAPACITY_PRESETS = [99, 300, 500, 1000, 3000];
const SITE_OPTIONS: ReadonlyArray<{ id: SiteType; label: string }> = [
  { id: "general", label: "일반부지" },
  { id: "building", label: "건축물" },
  { id: "forest", label: "임야" },
  { id: "water", label: "수상" },
];

export default function Step3Page() {
  const router = useRouter();
  const plant =
    useWizardStore((s) => s.plants[s.activePlantIndex]) ?? {};
  const updatePlant = useWizardStore((s) => s.updatePlant);
  const setStep = useWizardStore((s) => s.setStep);

  const [capacity, setCapacity] = useState<number>(plant.capacityKw ?? 99);
  const [siteType, setSiteType] = useState<SiteType>(
    plant.siteType ?? "general",
  );
  const [weightOverride, setWeightOverride] = useState<number | "">(
    plant.weightOverride ?? "",
  );

  const autoWeight = getWeight(siteType, capacity);
  const band = capacityBand(capacity);
  const effectiveWeight =
    typeof weightOverride === "number" ? weightOverride : autoWeight;

  const handleNext = () => {
    updatePlant({
      capacityKw: capacity,
      siteType,
      ...(typeof weightOverride === "number" ? { weightOverride } : {}),
    });
    setStep(4);
    router.push("/wizard/step-4-operation");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>발전소 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="capacity">
              설치 용량 (kW)
            </label>
            <Input
              id="capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              min={1}
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {CAPACITY_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCapacity(p)}
                  className={`text-xs rounded-md border px-2 py-1 transition-colors ${
                    capacity === p
                      ? "border-primary bg-accent"
                      : "hover:bg-accent"
                  }`}
                >
                  {p}kW
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">부지 종류</label>
            <div className="grid grid-cols-2 gap-2">
              {SITE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSiteType(o.id)}
                  className={`rounded-md border p-2 text-sm transition-colors ${
                    siteType === o.id
                      ? "border-primary bg-accent"
                      : "hover:bg-accent"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-sm space-y-2">
            <p>
              <span className="text-muted-foreground">자동 가중치:</span>{" "}
              <strong>{autoWeight}</strong>{" "}
              <span className="text-xs text-muted-foreground">
                ({siteType} × {band})
              </span>
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground text-xs">
                수동 오버라이드:
              </span>
              <Input
                type="number"
                step="0.1"
                placeholder="비워두면 자동값 사용"
                value={weightOverride === "" ? "" : weightOverride}
                onChange={(e) => {
                  const v = e.target.value;
                  setWeightOverride(v === "" ? "" : Number(v));
                }}
                className="h-8 max-w-[160px]"
              />
              <span className="text-xs">
                실제 적용: <strong>{effectiveWeight}</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          ← 뒤로
        </Button>
        <Button onClick={handleNext}>다음 →</Button>
      </div>
    </div>
  );
}
