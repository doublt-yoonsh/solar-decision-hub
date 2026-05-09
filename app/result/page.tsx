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
import { useWizardStore } from "@/lib/store/wizard";
import { simulate } from "@/lib/simulator";
import { analyzePortfolio } from "@/lib/portfolio";
import { analyzeBenchmark } from "@/lib/benchmark";
import type { PlantInput } from "@/lib/types/PlantInput";
import type { ScenarioId } from "@/lib/types/ScenarioResult";

// Lazy-load Recharts-heavy chart bundle and PDF generation. These two pieces
// account for the majority of /result's First Load JS — splitting them keeps
// the initial paint snappy on mobile.
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
      title="발전 효율(PR) = 모듈·인버터·전선·토양 손실 종합. 결과의 발전량과 매출에 직접 영향. 슬라이더로 0.65~0.90 조정 가능."
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
    <main className="min-h-screen p-4 sm:p-8 max-w-5xl mx-auto space-y-4 pb-24">
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

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              진단 (동급 대비)
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              정책 리스크
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">
              {portfolio.policyRisk.totalScore.toFixed(0)}/100
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex gap-2 flex-wrap items-center">
            <span>
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
              <CardTitle>발전 효율 백분위</CardTitle>
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
          <ScenarioCharts sim={sim} />
        </TabsContent>

        <TabsContent value="risk" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>정책 리스크 분해</CardTitle>
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
                <CardTitle>포트폴리오 분산도</CardTitle>
                <CardDescription>HHI 0~10000 (낮을수록 분산)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  지역 집중도:{" "}
                  <strong>{portfolio.concentrationByRegion.toFixed(0)}</strong>
                </p>
                <p>
                  부지 집중도:{" "}
                  <strong>{portfolio.concentrationBySiteType.toFixed(0)}</strong>
                </p>
                <p>
                  계통 집중도:{" "}
                  <strong>{portfolio.concentrationByGrid.toFixed(0)}</strong>
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t p-3 flex flex-wrap gap-2 justify-end max-w-5xl mx-auto">
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
