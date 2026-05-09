"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ScenarioId } from "@/lib/types/ScenarioResult";
import type { SimulationOutput } from "@/lib/simulator";

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

const SCENARIO_COLOR: Record<ScenarioId, string> = {
  A: "hsl(220 70% 50%)",
  B: "hsl(160 60% 45%)",
  C: "hsl(30 80% 55%)",
  D: "hsl(280 65% 60%)",
};

const krwShort = (n: number) => {
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(0)}만`;
  return Math.round(n).toLocaleString("ko-KR");
};

export interface ScenarioChartsProps {
  sim: SimulationOutput;
}

const IDS: ReadonlyArray<ScenarioId> = ["A", "B", "C", "D"];

export default function ScenarioCharts({ sim }: ScenarioChartsProps) {
  const npvData = IDS.map((id) => ({
    name: id,
    label: SCENARIO_LABEL[id],
    npv: sim.scenarios[id].npv,
    isBest: id === sim.bestScenario,
  }));

  const maxYears = Math.max(
    ...IDS.map((id) => sim.scenarios[id].yearlyBreakdown.length),
  );
  const cumulativeData: Array<Record<string, number>> = [];
  let cumA = 0,
    cumB = 0,
    cumC = 0,
    cumD = 0;
  for (let y = 0; y < maxYears; y++) {
    cumA += sim.scenarios.A.yearlyBreakdown[y]?.totalRevenue ?? 0;
    cumB += sim.scenarios.B.yearlyBreakdown[y]?.totalRevenue ?? 0;
    cumC += sim.scenarios.C.yearlyBreakdown[y]?.totalRevenue ?? 0;
    cumD += sim.scenarios.D.yearlyBreakdown[y]?.totalRevenue ?? 0;
    cumulativeData.push({ year: y + 1, A: cumA, B: cumB, C: cumC, D: cumD });
  }

  const sens = sim.sensitivity[sim.bestScenario];
  const tornadoData = sens.variables.map((v) => ({
    name:
      v.variable === "smp"
        ? "SMP ±20%"
        : v.variable === "discountRate"
          ? "할인율 ±2pp"
          : "출력제어 ±10pp",
    range: v.range,
  }));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>4 시나리오 NPV 비교</CardTitle>
          <CardDescription>
            녹색 막대 = 추천 시나리오 (정책리스크 보정 후 1위)
          </CardDescription>
        </CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={npvData}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis tickFormatter={krwShort} fontSize={11} />
              <Tooltip
                formatter={(v) => `${krwShort(Number(v))}원`}
                labelFormatter={(l) => `시나리오 ${l}`}
              />
              <Bar dataKey="npv" radius={[4, 4, 0, 0]}>
                {npvData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.isBest
                        ? "hsl(160 60% 45%)"
                        : SCENARIO_COLOR[d.name]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>누적 매출</CardTitle>
          <CardDescription>
            계약 종료까지 누적 (시나리오별 contractYears 다름)
          </CardDescription>
        </CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={cumulativeData}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                label={{
                  value: "년차",
                  position: "insideBottom",
                  fontSize: 11,
                }}
                fontSize={11}
              />
              <YAxis tickFormatter={krwShort} fontSize={11} />
              <Tooltip formatter={(v) => `${krwShort(Number(v))}원`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="A"
                stroke={SCENARIO_COLOR.A}
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="B"
                stroke={SCENARIO_COLOR.B}
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="C"
                stroke={SCENARIO_COLOR.C}
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="D"
                stroke={SCENARIO_COLOR.D}
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>민감도 분석 ({sim.bestScenario})</CardTitle>
          <CardDescription>
            NPV 변동 폭 (변수 ±delta) — 가장 큰 막대가 가장 영향력 큼
          </CardDescription>
        </CardHeader>
        <CardContent style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tornadoData}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
            >
              <XAxis type="number" tickFormatter={krwShort} fontSize={11} />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={11}
                width={100}
              />
              <Tooltip formatter={(v) => krwShort(Number(v))} />
              <Bar
                dataKey="range"
                fill={SCENARIO_COLOR[sim.bestScenario]}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>시나리오별 상세</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {IDS.map((id) => {
            const s = sim.scenarios[id];
            return (
              <div
                key={id}
                className="grid grid-cols-[auto_1fr_auto] gap-3 items-baseline border-b py-2 last:border-b-0"
              >
                <span className="font-mono font-semibold">{id}</span>
                <span className="text-muted-foreground text-xs sm:text-sm">
                  {SCENARIO_FULL[id]} · 첫해{" "}
                  {krwShort(s.yearlyBreakdown[0]?.totalRevenue ?? 0)}원 ·{" "}
                  {s.contractYears}년
                </span>
                <span className="font-medium">NPV {krwShort(s.npv)}원</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
