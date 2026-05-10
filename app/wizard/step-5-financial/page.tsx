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

function HelpDetails({ children }: { children: React.ReactNode }) {
  return (
    <details className="text-xs text-muted-foreground pt-1">
      <summary className="cursor-pointer hover:text-foreground select-none">
        📖 자세히
      </summary>
      <div className="pt-2 pl-3 border-l-2 border-muted space-y-1.5 leading-relaxed">
        {children}
      </div>
    </details>
  );
}

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
            기본값은 일반적 추정. 슬라이더로 조정하면 즉시 결과에 반영됩니다.
            각 항목의 「📖 자세히」를 누르면 의미와 영향을 볼 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-7">
          {/* CAPEX */}
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
            <HelpDetails>
              <p>
                <strong>Capital Expenditure</strong> — 발전소 건설·모듈 구입·시공·인허가 등{" "}
                <strong>1회성 초기 투자비</strong>입니다.
              </p>
              <p>
                📊 결과 영향: IRR(투자수익률), NPV, 회수기간 계산의 출발점이 됩니다.
                CAPEX가 크면 IRR과 NPV가 작아지고 회수기간이 길어집니다.
              </p>
              <p>
                💡 한국 PV 시장 평균은 <strong>1.0~1.4M원/kW</strong>.
                실제 EPC 견적이 다르면 직접 입력하세요. 100kW급은 1.3M, 1MW급은 1.0M에 가깝습니다.
              </p>
            </HelpDetails>
          </div>

          {/* PR */}
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
                  PVGIS 좌표별 추정: <strong>{derivedPR.toFixed(2)}</strong> (자동 적용됨) · 한국 평균 0.85
                </>
              ) : (
                <>한국 평균 0.85 · 보수 0.80 · 낙관 0.88</>
              )}
            </p>
            <HelpDetails>
              <p>
                <strong>Performance Ratio (PR)</strong> — 시스템이 받은 일사량을 실제 전력으로 변환하는{" "}
                <strong>효율 (0~1)</strong>. 1.0이면 손실 0% (이론값).
              </p>
              <p>
                <strong>한국 평균 0.85</strong> = 시스템 손실 15% (모듈 열화 + 인버터 + 전선 + 토양/먼지 + 그림자 종합).
              </p>
              <p>
                📊 결과 영향: <strong>매출에 직접 비례</strong>.
                0.85 → 0.80으로 낮추면 매출 약 5.9% 감소.
                0.85 → 0.88로 높이면 매출 약 3.5% 증가.
              </p>
              <p>
                💡 PVGIS는 좌표별 환경 손실(각도·온도·분광)을 반영해{" "}
                <strong>좌표마다 다른 PR</strong>을 추정합니다 (산악·해안 차이).
                실측값이 있으면 직접 슬라이더로 보정하세요.
              </p>
            </HelpDetails>
          </div>

          {/* 할인율 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>할인율 (NPV 계산용)</span>
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
            <HelpDetails>
              <p>
                <strong>할인율 (Discount Rate)</strong> — 미래 매출을 「지금 가치」로 환산하는 비율.
                이 투자를 안 하고 다른 곳에 넣었을 때 받을 수 있는 수익률을 의미합니다.
              </p>
              <p>
                일반적으로 <strong>사업자 자본비용 (WACC)</strong> = 대출금리 + 자기자본 기대수익률의 가중평균.
              </p>
              <p>
                📊 결과 영향: 할인율이 높을수록 미래 매출의 현재가치가 낮아져 NPV 감소.
                <br />
                같은 매출도 5% → 8%면 NPV 약 30% 감소.
              </p>
              <p>
                💡 한국 PV PF 평균: <strong>4~6%</strong>. 사업자 신용도와 금리 환경에 따라 다름.
                보수적이면 7%, 자본비용 낮으면 4%.
              </p>
            </HelpDetails>
          </div>

          {/* 자기자본 비율 */}
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
            <p className="text-xs text-muted-foreground">
              총 CAPEX 중 본인 자본 비중 — 디폴트 30%
            </p>
            <HelpDetails>
              <p>
                <strong>자기자본 비율 (Equity Ratio)</strong> — 총 CAPEX 중 본인 자본 투입 비중.
                나머지는 PF 대출(부채) 등으로 조달.
              </p>
              <p>
                30% = 한국 PV PF <strong>표준 (20~30%)</strong>. CAPEX 1억이면 자기자본 3천만원 + 대출 7천만원.
              </p>
              <p>
                📊 결과 영향: <strong>Equity IRR(자기자본 수익률)</strong> 계산.
                자기자본 비율이 낮을수록 레버리지 효과로 Equity IRR이 높아지지만,
                이자 부담과 위험도 함께 증가합니다.
              </p>
              <p>
                💡 v0.1.0은 단순화 모델. 실제 PF는 대출 금리·만기·DSCR 등 추가 모델링이 필요합니다 (v1.x 예정).
              </p>
            </HelpDetails>
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
