"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

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
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useWizardStore } from "@/lib/store/wizard";
import { simulate } from "@/lib/simulator";
import { analyzePortfolio } from "@/lib/portfolio";
import { analyzeBenchmark } from "@/lib/benchmark";
import type { PlantInput } from "@/lib/types/PlantInput";
import type { ScenarioId } from "@/lib/types/ScenarioResult";

const ScenarioCharts = dynamic(
  () => import("@/components/result/ScenarioCharts"),
  {
    ssr: false,
    loading: () => <ChartSkeleton stack={3} />,
  },
);

const PDFSection = dynamic(
  () => import("@/components/result/PDFSection"),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" disabled>
        📄 준비 중...
      </Button>
    ),
  },
);

const SCENARIO_FULL: Record<ScenarioId, string> = {
  A: "현물시장 (SMP+REC)",
  B: "고정가격계약 (20년)",
  C: "2027 신규입찰 (추정)",
  D: "직접 PPA",
};

const HELP_TEXT = {
  npv: "순현재가치 (NPV) — 미래 매출을 할인율로 환산한 현재가치 합계. 양수면 사업성 있음.",
  irr: "내부수익률 (IRR) — NPV가 0이 되는 할인율. 사업자 자본비용보다 높으면 투자 가치 있음.",
  paybackPeriod:
    "회수기간 — 누적 수익이 CAPEX와 같아지는 시점. 짧을수록 위험 낮음.",
  riskRange:
    "변동성 폭 — Monte Carlo 1000회 시뮬레이션의 10/50/90 percentile NPV.",
  percentile:
    "동급 대비 백분위 — 같은 시도·부지·용량 가상 1000개 발전소 중 상위 X%.",
  policyRisk:
    "정책 리스크 0~100 — A 비중×30 + C 비중×40 + Sunset 시기 신설 비중×30. 높을수록 RPS 폐지 영향 큼.",
  curtailment:
    "출력제어 노출 — 권역별 평균 출력제어율을 발전소 용량으로 가중평균. 추정값.",
  hhi: "Herfindahl-Hirschman Index — 0~10000. 1500 이하 분산, 2500 이상 집중. 단일 지역 100% = 10000.",
  pr: "발전 효율 (PR) — 시스템이 일사량을 전력으로 변환하는 효율. 한국 평균 0.85.",
  discountRate:
    "할인율 — 미래 매출을 현재가치로 환산하는 비율. 사업자 자본비용 가정.",
} as const;

function HelpIcon({ text }: { text: string }) {
  return (
    <span className="relative inline-block group align-baseline ml-1">
      <span
        className="text-muted-foreground group-hover:text-foreground group-focus-within:text-foreground cursor-help text-[10px] select-none"
        tabIndex={0}
        aria-label="도움말"
      >
        ⓘ
      </span>
      <span
        role="tooltip"
        className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity duration-150 absolute z-50 top-full left-0 mt-1.5 w-72 max-w-[calc(100vw-2rem)] p-2.5 bg-foreground text-background text-xs leading-relaxed rounded-md shadow-lg pointer-events-none whitespace-normal"
      >
        {text}
      </span>
    </span>
  );
}

function ChartSkeleton({ stack = 1 }: { stack?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: stack }).map((_, i) => (
        <div
          key={i}
          className="h-72 bg-muted/50 animate-pulse rounded-md"
        />
      ))}
    </div>
  );
}

function isFullPlant(p: Partial<PlantInput>): p is PlantInput {
  return Boolean(p.id && p.capacityKw && p.siteType && p.location);
}

const krwShort = (n: number) => {
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(0)}만`;
  return Math.round(n).toLocaleString("ko-KR");
};

function PRBadge({ pr }: { pr: number }) {
  const tone =
    pr >= 0.87
      ? { label: "낙관적", cls: "bg-emerald-100 text-emerald-800" }
      : pr <= 0.81
        ? { label: "보수적", cls: "bg-amber-100 text-amber-800" }
        : { label: "한국 평균", cls: "bg-blue-100 text-blue-800" };
  return (
    <span
      className={`text-[10px] rounded px-1.5 py-0.5 ${tone.cls}`}
      title={HELP_TEXT.pr}
    >
      발전 효율: {tone.label} (PR {pr.toFixed(2)})
    </span>
  );
}

function EstimateBadge({ label }: { label: string }) {
  return (
    <span
      className="text-[10px] rounded px-1.5 py-0.5 bg-amber-100 text-amber-800"
      title="공개 통계 추정값 — 신뢰도 medium 이하"
    >
      {label}
    </span>
  );
}

export default function ResultPage() {
  const plants = useWizardStore((s) => s.plants);
  const performanceRatio = useWizardStore((s) => s.performanceRatio);
  const discountRate = useWizardStore((s) => s.discountRate);
  const setPR = useWizardStore((s) => s.setPerformanceRatio);
  const setDR = useWizardStore((s) => s.setDiscountRate);
  const [hydrated, setHydrated] = useState(false);
  const [pdfMounted, setPdfMounted] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const fullPlants = useMemo(
    () => plants.filter(isFullPlant) as PlantInput[],
    [plants],
  );
  const primary = fullPlants[0];

  const sim = useMemo(() => {
    if (!primary) return null;
    return simulate({
      plant: { ...primary, performanceRatio },
      discountRate,
      iterations: 200,
      seed: 42,
    });
  }, [primary, performanceRatio, discountRate]);

  const portfolio = useMemo(
    () => (fullPlants.length > 0 ? analyzePortfolio(fullPlants) : null),
    [fullPlants],
  );

  const benchmark = useMemo(
    () => (primary ? analyzeBenchmark(primary) : null),
    [primary],
  );

  const policyComponents = useMemo(() => {
    if (!portfolio) return [];
    const c = portfolio.policyRisk.components;
    return [
      { name: "A 비중", value: c.scenarioAExposure, max: 30 },
      { name: "C 비중", value: c.scenarioCExposure, max: 40 },
      { name: "Sunset 신설", value: c.sunsetTimingRisk, max: 30 },
    ];
  }, [portfolio]);

  if (!hydrated) {
    return (
      <main className="p-6 text-sm text-muted-foreground">로딩 중...</main>
    );
  }

  if (!primary || !sim || !portfolio || !benchmark) {
    return (
      <main className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>입력된 발전소가 없습니다</CardTitle>
            <CardDescription>
              먼저 데모를 실행하거나 위저드로 발전소를 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button asChild>
              <Link href="/">랜딩으로</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/wizard/step-1-user-type">위저드 시작</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            {primary.name ?? primary.id} — 분석 결과
          </CardTitle>
          <CardDescription className="flex flex-wrap gap-2 items-center">
            <span>
              {primary.capacityKw}kW · {primary.siteType} ·{" "}
              {primary.location.region.sido} {primary.location.region.sigungu}
            </span>
            <PRBadge pr={performanceRatio} />
            <span className="text-xs">
              · 할인율 {(discountRate * 100).toFixed(1)}%
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* C: Interactive assumption sliders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            ⚙️ 가정 조정
            <span className="text-xs text-muted-foreground font-normal">
              슬라이더를 움직이면 즉시 결과 갱신
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-5 pt-0">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                발전 효율 (PR)
                <HelpIcon text={HELP_TEXT.pr} />
              </span>
              <span className="font-medium">
                {performanceRatio.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[performanceRatio]}
              min={0.65}
              max={0.9}
              step={0.01}
              onValueChange={(v) => setPR(v[0]!)}
            />
            <p className="text-[10px] text-muted-foreground">
              한국 평균 0.85 · 보수 0.80 · 낙관 0.88
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                할인율 (NPV 계산용)
                <HelpIcon text={HELP_TEXT.discountRate} />
              </span>
              <span className="font-medium">
                {(discountRate * 100).toFixed(1)}%
              </span>
            </div>
            <Slider
              value={[discountRate]}
              min={0.03}
              max={0.1}
              step={0.005}
              onValueChange={(v) => setDR(v[0]!)}
            />
            <p className="text-[10px] text-muted-foreground">
              사업자 자본비용 가정 — 디폴트 5%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary 3 cards */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              진단 (동급 대비)
              <HelpIcon text={HELP_TEXT.percentile} />
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">
              상위 {(100 - benchmark.efficiencyPercentile).toFixed(0)}%
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {benchmark.peerCount}개소 비교 ({benchmark.stratification.level})
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              추천 시나리오
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">
              {sim.bestScenario}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {SCENARIO_FULL[sim.bestScenario]} · NPV{" "}
            {krwShort(sim.scenarios[sim.bestScenario].npv)}원
            <HelpIcon text={HELP_TEXT.npv} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              정책 리스크
              <HelpIcon text={HELP_TEXT.policyRisk} />
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">
              {portfolio.policyRisk.totalScore.toFixed(0)}/100
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex gap-2 flex-wrap items-center">
            <span title={HELP_TEXT.curtailment}>
              출력제어 {(portfolio.weightedCurtailmentRate * 100).toFixed(1)}%
            </span>
            <EstimateBadge label="추정값" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scenarios">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="diagnosis">진단</TabsTrigger>
          <TabsTrigger value="scenarios">시나리오</TabsTrigger>
          <TabsTrigger value="risk">리스크</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnosis" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1">
                발전 효율 백분위
                <HelpIcon text={HELP_TEXT.percentile} />
              </CardTitle>
              <CardDescription>
                동급 발전소 {benchmark.peerCount}개소 대비 (kWh/kWp/year 기준)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 h-full bg-primary"
                    style={{
                      width: `${benchmark.efficiencyPercentile}%`,
                    }}
                  />
                  <div
                    className="absolute top-0 -translate-x-1/2 h-3 w-0.5 bg-foreground"
                    style={{
                      left: `${benchmark.efficiencyPercentile}%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div>
                  <p className="text-muted-foreground">내 발전소</p>
                  <p className="text-base font-semibold">
                    {benchmark.genPerKw.toFixed(0)} kWh/kWp/yr
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">동급 평균</p>
                  <p className="text-base font-semibold">
                    {benchmark.peerStats.meanKwhPerKw.toFixed(0)} kWh/kWp/yr
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">연 추정 발전량</p>
                  <p className="text-base font-semibold">
                    {(benchmark.estimatedAnnualGen / 1000).toFixed(0)} MWh
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">표준편차 (peer)</p>
                  <p className="text-base font-semibold">
                    ±{benchmark.peerStats.stdDevKwhPerKw.toFixed(0)} kWh/kWp/yr
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-3 mt-4">
          {/* B: Why this recommendation? Explainer card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                💡 왜 시나리오 {sim.explanation.winner}가 추천되었나?
              </CardTitle>
              <CardDescription>
                {SCENARIO_FULL[sim.explanation.winner]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  추천 이유
                </p>
                <ul className="space-y-1">
                  {sim.explanation.primaryReasons.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground">·</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  시나리오 순위
                </p>
                <ul className="space-y-1.5">
                  {sim.explanation.comparison.map((c) => (
                    <li
                      key={c.id}
                      className={`grid grid-cols-[auto_auto_1fr_auto] gap-2 items-baseline text-xs py-1 ${
                        c.id === sim.explanation.winner
                          ? "text-emerald-700 font-medium"
                          : ""
                      }`}
                    >
                      <span className="font-mono">{c.rankPosition}위</span>
                      <span className="font-mono font-semibold">{c.id}</span>
                      <span className="text-muted-foreground">
                        {SCENARIO_FULL[c.id]}
                      </span>
                      <span>{c.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {sim.explanation.caveats.length > 0 && (
                <div className="pt-3 border-t bg-amber-50/60 -mx-6 -mb-6 px-6 py-3 rounded-b-lg">
                  <p className="text-xs font-medium text-amber-900 mb-1">
                    ⚠️ 주의사항
                  </p>
                  <ul className="space-y-1 text-xs text-amber-900">
                    {sim.explanation.caveats.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span>·</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <ScenarioCharts sim={sim} />
        </TabsContent>

        <TabsContent value="risk" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1">
                정책 리스크 분해
                <HelpIcon text={HELP_TEXT.policyRisk} />
              </CardTitle>
              <CardDescription>
                {portfolio.policyRisk.formulaDescription} ·{" "}
                {portfolio.policyRisk.formulaVersion}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {policyComponents.map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{c.name}</span>
                    <span>
                      {c.value.toFixed(0)} / {c.max}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(c.value / c.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 text-xs text-muted-foreground">
                총 점수:{" "}
                <strong className="text-foreground">
                  {portfolio.policyRisk.totalScore.toFixed(0)}/100
                </strong>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>추천 사항</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {sim.recommendations.length === 0 &&
                portfolio.recommendations.length === 0 && (
                  <p className="text-muted-foreground">없음</p>
                )}
              <ul className="space-y-1.5">
                {sim.recommendations.map((r, i) => (
                  <li key={`sim-${i}`} className="text-muted-foreground">
                    · {r}
                  </li>
                ))}
                {portfolio.recommendations.map((r, i) => (
                  <li key={`port-${i}`} className="text-muted-foreground">
                    ·{" "}
                    <strong className="uppercase text-[10px] mr-1">
                      [{r.severity}]
                    </strong>
                    {r.message}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {fullPlants.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1">
                  포트폴리오 분산도
                  <HelpIcon text={HELP_TEXT.hhi} />
                </CardTitle>
                <CardDescription>
                  HHI 0~10000 (낮을수록 분산)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  지역 집중도:{" "}
                  <strong>
                    {portfolio.concentrationByRegion.toFixed(0)}
                  </strong>
                </p>
                <p>
                  부지 집중도:{" "}
                  <strong>
                    {portfolio.concentrationBySiteType.toFixed(0)}
                  </strong>
                </p>
                <p>
                  계통 집중도:{" "}
                  <strong>
                    {portfolio.concentrationByGrid.toFixed(0)}
                  </strong>
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 -mx-4 sm:-mx-8 mt-4 bg-background/95 backdrop-blur border-t p-3 flex flex-wrap gap-2 justify-end">
        <Button variant="outline" asChild>
          <Link href="/docs">가정 보기</Link>
        </Button>
        {pdfMounted ? (
          <PDFSection
            plant={primary}
            sim={sim}
            portfolio={portfolio}
            benchmark={benchmark}
            performanceRatio={performanceRatio}
            discountRate={discountRate}
          />
        ) : (
          <Button
            variant="outline"
            onClick={() => setPdfMounted(true)}
          >
            📄 PDF 준비
          </Button>
        )}
        <Button asChild>
          <Link href="/wizard/step-1-user-type">↩ 입력 수정</Link>
        </Button>
      </div>
    </main>
  );
}
