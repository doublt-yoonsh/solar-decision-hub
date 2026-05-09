"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

import type { PlantInput } from "../types/PlantInput";
import type { SimulationOutput } from "../simulator";
import type { PortfolioMetrics } from "../types/PortfolioMetrics";
import type { BenchmarkResult } from "../benchmark";
import type { ScenarioId } from "../types/ScenarioResult";

// Noto Sans KR self-hosted from /public/fonts (committed to repo).
// Relative paths resolve against window.location.origin in the browser, which
// is where PDFDownloadLink runs. No CDN dependency.
Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: "/fonts/NotoSansKR-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/NotoSansKR-Bold.ttf", fontWeight: "bold" },
  ],
});

const SCENARIO_LABEL: Record<ScenarioId, string> = {
  A: "현물시장",
  B: "고정가격",
  C: "2027 신규",
  D: "직접 PPA",
};

const SCENARIO_FULL: Record<ScenarioId, string> = {
  A: "현물시장 (SMP+REC)",
  B: "고정가격계약 (20년)",
  C: "2027 신규입찰 (추정)",
  D: "직접 PPA",
};

const krwShort = (n: number): string => {
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(1)}억원`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(0)}만원`;
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "NotoSansKR",
    color: "#222",
  },
  h1: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  h2: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingBottom: 2,
  },
  h3: { fontSize: 11, fontWeight: "bold", marginTop: 8, marginBottom: 2 },
  p: { marginBottom: 2, lineHeight: 1.4 },
  small: { fontSize: 8, color: "#666" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  bar: { height: 6, backgroundColor: "#e5e5e5", marginVertical: 2 },
  barFill: { height: 6, backgroundColor: "#222" },
  barFillBest: { height: 6, backgroundColor: "#16a34a" },
});

export interface ReportProps {
  plant: PlantInput;
  sim: SimulationOutput;
  portfolio: PortfolioMetrics;
  benchmark: BenchmarkResult;
  performanceRatio: number;
  discountRate: number;
}

export function Report({
  plant,
  sim,
  portfolio,
  benchmark,
  performanceRatio,
  discountRate,
}: ReportProps): React.ReactElement {
  const ids: ScenarioId[] = ["A", "B", "C", "D"];
  const maxNpv = Math.max(0, ...ids.map((id) => sim.scenarios[id].npv));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Solar Decision Hub — 분석 리포트</Text>
        <Text style={styles.small}>
          v0.1.0 · 생성일 {new Date().toLocaleDateString("ko-KR")}
        </Text>

        <Text style={styles.h2}>발전소 정보</Text>
        <Text style={styles.p}>이름: {plant.name ?? plant.id}</Text>
        <Text style={styles.p}>위치: {plant.location.address}</Text>
        <Text style={styles.p}>
          좌표: {plant.location.lat.toFixed(4)},{" "}
          {plant.location.lng.toFixed(4)}
        </Text>
        <Text style={styles.p}>
          용량: {plant.capacityKw} kW · 부지: {plant.siteType}
        </Text>
        <Text style={styles.p}>
          가정: PR {performanceRatio} · 할인율{" "}
          {(discountRate * 100).toFixed(1)}%
        </Text>

        <Text style={styles.h2}>진단 (벤치마킹)</Text>
        <Text style={styles.p}>
          동급 발전소 {benchmark.peerCount}개소 대비 효율 백분위: 상위{" "}
          {(100 - benchmark.efficiencyPercentile).toFixed(0)}%
        </Text>
        <Text style={styles.p}>
          내 발전소: {benchmark.genPerKw.toFixed(0)} kWh/kWp/yr · 동급 평균:{" "}
          {benchmark.peerStats.meanKwhPerKw.toFixed(0)} kWh/kWp/yr
        </Text>
        <Text style={styles.p}>
          연간 추정 발전량: {(benchmark.estimatedAnnualGen / 1000).toFixed(0)} MWh
        </Text>

        <Text style={styles.h2}>4 시나리오 NPV 비교</Text>
        <Text style={styles.p}>
          추천 시나리오: {sim.bestScenario} (
          {SCENARIO_LABEL[sim.bestScenario]})
        </Text>
        {ids.map((id) => {
          const s = sim.scenarios[id];
          const widthPct = maxNpv > 0 ? Math.max(0, (s.npv / maxNpv) * 100) : 0;
          const isBest = id === sim.bestScenario;
          return (
            <View key={id} style={{ marginBottom: 4 }}>
              <View style={styles.rowBetween}>
                <Text>
                  {id} · {SCENARIO_FULL[id]}
                  {isBest ? " ★" : ""}
                </Text>
                <Text>
                  NPV {krwShort(s.npv)} · 첫해{" "}
                  {krwShort(s.yearlyBreakdown[0]?.totalRevenue ?? 0)}
                </Text>
              </View>
              <View style={styles.bar}>
                <View
                  style={[
                    isBest ? styles.barFillBest : styles.barFill,
                    { width: `${widthPct}%` },
                  ]}
                />
              </View>
            </View>
          );
        })}

        <Text style={styles.h2}>리스크 분석</Text>
        <Text style={styles.p}>
          정책 리스크: {portfolio.policyRisk.totalScore.toFixed(0)}/100
        </Text>
        <Text style={styles.small}>
          {portfolio.policyRisk.formulaDescription}
        </Text>
        <Text style={styles.p}>
          출력제어 노출: {(portfolio.weightedCurtailmentRate * 100).toFixed(2)}% (추정값)
        </Text>

        <Text style={styles.h3}>추천 사항</Text>
        {sim.recommendations.map((r, i) => (
          <Text key={`s-${i}`} style={styles.p}>
            · {r}
          </Text>
        ))}
        {portfolio.recommendations.map((r, i) => (
          <Text key={`p-${i}`} style={styles.p}>
            · [{r.severity}] {r.message}
          </Text>
        ))}

        <Text style={[styles.small, { marginTop: 16 }]}>
          본 도구의 추정값은 공개 데이터 기반이며 ±10% 오차가 있을 수 있습니다.
          실제 사업 결정은 현장 조사와 전문가 자문이 필요합니다.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>부록 — 가정 및 데이터 출처</Text>

        <Text style={styles.h2}>적용 가정</Text>
        <Text style={styles.p}>
          · Performance Ratio: {performanceRatio} (한국 평균 baseline 0.85)
        </Text>
        <Text style={styles.p}>
          · 할인율: {(discountRate * 100).toFixed(1)}%
        </Text>
        <Text style={styles.p}>· 열화율: 연 0.5%</Text>
        <Text style={styles.p}>
          · REC sunset 가정: 2027년부터 신규 REC 발급 0
        </Text>
        <Text style={styles.p}>
          · 시나리오 B 분해: smpBaseValue 80원/kWh 추정 (smpBaseSource: estimated)
        </Text>
        <Text style={styles.p}>
          · 시나리오 C: 디폴트 130원/kWh, 정책 미확정
        </Text>
        <Text style={styles.p}>
          · 시나리오 D: 디폴트 PPA 160원, 송배전 12원 차감
        </Text>

        <Text style={styles.h2}>데이터 출처</Text>
        <Text style={styles.p}>· KPX 전력거래소 — 월간 SMP</Text>
        <Text style={styles.p}>· 한국에너지공단 RPS 시스템 — REC 거래</Text>
        <Text style={styles.p}>· 산업통상자원부 — RPS 운영지침 (가중치)</Text>
        <Text style={styles.p}>· 공공데이터포털 — 한전 송변전 GeoJSON</Text>
        <Text style={styles.p}>· 기상청 ASOS — 시도 평균 일사량</Text>
        <Text style={styles.p}>
          · 산업부 + 언론 보도 종합 — 출력제어 통계 (추정)
        </Text>

        <Text style={styles.h2}>한계</Text>
        <Text style={styles.p}>
          · SMP/REC 데이터는 월별 평균 시드 (일별 시계열은 v1.x 보강 예정)
        </Text>
        <Text style={styles.p}>
          · 변전소 위치는 12개 시드 (전체 600+개는 v1.x 보강)
        </Text>
        <Text style={styles.p}>
          · 출력제어 통계는 공식 통합 통계 부재로 추정
        </Text>
        <Text style={styles.p}>
          · auctionResults 분해는 모두 추정 (smpBaseValue=80원 일관 가정)
        </Text>
        <Text style={styles.p}>
          · 시나리오 C는 정책 미확정 — 정부 발표 후 재검토 필요
        </Text>
      </Page>
    </Document>
  );
}
