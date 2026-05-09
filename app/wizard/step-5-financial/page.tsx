"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useWizardStore } from "@/lib/store/wizard";

const CAPEX_PER_KW = 1_300_000;

export default function Step5Page() {
  const router = useRouter();
  const plant =
    useWizardStore((s) => s.plants[s.activePlantIndex]) ?? {};
  const updatePlant = useWizardStore((s) => s.updatePlant);
  const performanceRatio = useWizardStore((s) => s.performanceRatio);
  const setPR = useWizardStore((s) => s.setPerformanceRatio);
  const discountRate = useWizardStore((s) => s.discountRate);
  const setDR = useWizardStore((s) => s.setDiscountRate);
  const equityRatio = useWizardStore((s) => s.equityRatio);
  const setEquity = useWizardStore((s) => s.setEquityRatio);
  const markComplete = useWizardStore((s) => s.markComplete);

  const capacityKw = plant.capacityKw ?? 99;
  const initialCapex = plant.capex ?? capacityKw * CAPEX_PER_KW;
  const [capex, setCapex] = useState<number>(initialCapex);
  const [capexStr, setCapexStr] = useState<string>(
    initialCapex.toLocaleString("ko-KR"),
  );

  // Auto-apply PVGIS-derived PR once on mount, if available.
  const derivedPR = plant.location?.solarIrradiance?.derivedPR;
  const [autoApplied, setAutoApplied] = useState(false);
  useEffect(() => {
    if (derivedPR !== undefined && !autoApplied) {
      const clamped = Math.max(0.65, Math.min(0.9, derivedPR));
      setPR(+clamped.toFixed(2));
      setAutoApplied(true);
    }
  }, [derivedPR, autoApplied, setPR]);

  const handleCapexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const num = raw === "" ? 0 : parseInt(raw, 10);
    setCapex(num);
    setCapexStr(num === 0 ? "" : num.toLocaleString("ko-KR"));
  };

  const handleFinish = () => {
    updatePlant({ capex });
    markComplete();
    router.push("/result");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>재무 가정</CardTitle>
          <CardDescription>
            기본값은 일반적 추정. 슬라이더로 조정하면 즉시 결과에 반영됩니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="capex">
              CAPEX (총 투자비)
            </label>
            <Input
              id="capex"
              type="text"
              inputMode="numeric"
              value={capexStr}
              onChange={handleCapexChange}
              placeholder="예: 128,700,000"
            />
            <p className="text-xs text-muted-foreground">
              자동 추정: {capacityKw}kW × 1,300,000원 ={" "}
              {(capacityKw * CAPEX_PER_KW).toLocaleString("ko-KR")}원
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>발전 효율 (PR)</span>
              <span>{performanceRatio.toFixed(2)}</span>
            </div>
            <Slider
              value={[performanceRatio]}
              min={0.65}
              max={0.9}
              step={0.01}
              onValueChange={(v) => setPR(v[0]!)}
            />
            <p className="text-xs text-muted-foreground">
              {derivedPR !== undefined ? (
                <>
                  PVGIS 좌표별 추정:{" "}
                  <strong>{derivedPR.toFixed(2)}</strong> (자동 적용됨) ·
                  한국 평균 0.85 · 보수 0.80 · 낙관 0.88
                </>
              ) : (
                <>한국 평균 0.85 · 보수 0.80 · 낙관 0.88</>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>할인율 (NPV)</span>
              <span>{(discountRate * 100).toFixed(1)}%</span>
            </div>
            <Slider
              value={[discountRate]}
              min={0.03}
              max={0.1}
              step={0.005}
              onValueChange={(v) => setDR(v[0]!)}
            />
            <p className="text-xs text-muted-foreground">
              사업자 자본비용 가정 — 디폴트 5%
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>자기자본 비율</span>
              <span>{(equityRatio * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[equityRatio]}
              min={0.1}
              max={0.7}
              step={0.05}
              onValueChange={(v) => setEquity(v[0]!)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          ← 뒤로
        </Button>
        <Button onClick={handleFinish}>완료 → 결과 보기</Button>
      </div>
    </div>
  );
}
