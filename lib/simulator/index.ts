// /lib/simulator/index.ts
// Public entry point — runs all 4 scenarios + sensitivity + best pick.

import type { ScenarioId, ScenarioResult } from "../types/ScenarioResult";
import { simulateScenarioA } from "./scenarios/A";
import { simulateScenarioB } from "./scenarios/B";
import { simulateScenarioC } from "./scenarios/C";
import { simulateScenarioD } from "./scenarios/D";
import { runSensitivity, type SensitivityResult } from "./sensitivity";
import type { SimulatorInput } from "./types";

export * from "./types";
export { simulateScenarioA } from "./scenarios/A";
export { simulateScenarioB } from "./scenarios/B";
export { simulateScenarioC } from "./scenarios/C";
export { simulateScenarioD } from "./scenarios/D";
export { runSensitivity } from "./sensitivity";

const SCENARIO_NAMES: Record<ScenarioId, string> = {
  A: "현물시장 (SMP+REC)",
  B: "고정가격계약 (20년)",
  C: "2027 신규입찰 (추정)",
  D: "직접 PPA",
};

const krwShort = (n: number): string => {
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(0)}만`;
  return Math.round(n).toLocaleString("ko-KR");
};

export interface ScenarioComparison {
  id: ScenarioId;
  scoreNpv: number;
  rankPosition: 1 | 2 | 3 | 4;
  /** Gap to 1st place in NPV (0 for winner). */
  gapFromBest: number;
  /** Plain-Korean ranking reason. */
  reason: string;
}

/**
 * Why-this-recommendation explainer surfaced on the result page.
 * Drives the "추천 이유" card under the bestScenario summary.
 */
export interface RecommendationExplanation {
  winner: ScenarioId;
  /** 3~5 ordered Korean bullets explaining the recommendation. */
  primaryReasons: string[];
  /** All 4 scenarios with rank + gap from winner. */
  comparison: ScenarioComparison[];
  /** Caveats (variability, policy uncertainty, contract length). */
  caveats: string[];
}

export interface SimulationOutput {
  scenarios: {
    A: ScenarioResult;
    B: ScenarioResult;
    C: ScenarioResult;
    D: ScenarioResult;
  };
  sensitivity: Record<ScenarioId, SensitivityResult>;
  /** Highest-scoring scenario after policy-risk haircut (C × 0.85). */
  bestScenario: ScenarioId;
  /** Plain-Korean recommendation lines (legacy short list). */
  recommendations: string[];
  /** Detailed explanation for the result page card. */
  explanation: RecommendationExplanation;
}

const POLICY_HAIRCUT = { C: 0.85 } as const;

/** Run all 4 scenarios + tornado sensitivity + recommendation summary. */
export function simulate(input: SimulatorInput): SimulationOutput {
  const a = simulateScenarioA(input);
  const b = simulateScenarioB(input);
  const c = simulateScenarioC(input);
  const d = simulateScenarioD(input);

  const scoreA = a.riskRange?.mid ?? a.npv;
  const scoreB = b.npv;
  const scoreC = c.npv * POLICY_HAIRCUT.C;
  const scoreD = d.npv;
  const ranked = [
    { id: "A" as ScenarioId, score: scoreA },
    { id: "B" as ScenarioId, score: scoreB },
    { id: "C" as ScenarioId, score: scoreC },
    { id: "D" as ScenarioId, score: scoreD },
  ].sort((x, y) => y.score - x.score);
  const bestScenario = ranked[0]!.id;
  const winnerNpv = ranked[0]!.score;

  const sensitivity: Record<ScenarioId, SensitivityResult> = {
    A: runSensitivity("A", input),
    B: runSensitivity("B", input),
    C: runSensitivity("C", input),
    D: runSensitivity("D", input),
  };

  // -- Build explanation -------------------------------------------------
  const winner = ranked[0]!;
  const second = ranked[1]!;
  const winnerResult: ScenarioResult = {
    A: a,
    B: b,
    C: c,
    D: d,
  }[winner.id];

  const primaryReasons: string[] = [];
  primaryReasons.push(
    `${SCENARIO_NAMES[winner.id]} NPV ${krwShort(winnerResult.npv)}원이 정책리스크 보정 후 1위`,
  );
  primaryReasons.push(
    `2위 ${SCENARIO_NAMES[second.id]} 대비 ${krwShort(winner.score - second.score)}원 우위`,
  );

  switch (winner.id) {
    case "A":
      primaryReasons.push(
        "REC 매도 가능 기간(2027 이전) 동안 SMP+REC 합산이 유리",
      );
      if (a.riskRange) {
        primaryReasons.push(
          `다만 변동성 큼 — 보수 케이스 NPV ${krwShort(a.riskRange.low)}원 / 낙관 ${krwShort(a.riskRange.high)}원`,
        );
      }
      break;
    case "B":
      primaryReasons.push("20년 고정 단가 계약으로 안정적 수익 보장");
      primaryReasons.push(
        "SMP·REC 변동 위험 0 — 단, 입찰 통과 필요 + 인플레이션 미반영",
      );
      break;
    case "C":
      primaryReasons.push("2027 신규입찰 추정 단가가 가장 매력적");
      primaryReasons.push(
        "⚠️ 정책 미확정 — 정부 발표 전까지 모든 수치 추정값",
      );
      break;
    case "D":
      primaryReasons.push("RE100 기업과 직접 협상 — 단가 자유도 큼");
      primaryReasons.push(
        `계약기간 ${d.contractYears}년 — 협상력에 따라 결과 큰 차이`,
      );
      break;
  }

  const comparison: ScenarioComparison[] = ranked.map((r, i) => {
    const rankPosition = (i + 1) as 1 | 2 | 3 | 4;
    const gap = winnerNpv - r.score;
    let reason: string;
    if (i === 0) {
      reason = "1위 — 추천";
    } else if (i === 1) {
      reason = `2위 (1위 대비 ${krwShort(gap)}원 차이)`;
    } else {
      reason = `${rankPosition}위`;
    }
    return {
      id: r.id,
      scoreNpv: r.score,
      rankPosition,
      gapFromBest: gap,
      reason,
    };
  });

  const caveats: string[] = [];
  if (winner.id === "C") {
    caveats.push("시나리오 C는 정책 미확정 — 정부 발표 후 재검토 필수");
  }
  if (a.riskRange && a.riskRange.low < b.npv * 0.5) {
    caveats.push(
      "시나리오 A 변동성 큼 — 보수 케이스 NPV가 B의 절반 미만",
    );
  }
  if (d.contractYears < 15) {
    caveats.push(
      `직접 PPA 계약기간 ${d.contractYears}년으로 짧음 — 장기 안정성은 B/C가 유리`,
    );
  }
  if (sensitivity[winner.id].variables[0]) {
    const top = sensitivity[winner.id].variables[0]!;
    const label =
      top.variable === "smp"
        ? "SMP 가격"
        : top.variable === "discountRate"
          ? "할인율"
          : "출력제어율";
    caveats.push(
      `결과는 ${label} 변동에 가장 민감 (NPV 변동폭 ${krwShort(top.range)}원)`,
    );
  }

  // -- Legacy recommendations (keep for backward compat) ----------------
  const recommendations: string[] = [];
  recommendations.push(
    `최적 시나리오: ${bestScenario} (NPV 기준, C는 정책리스크 ${(1 - POLICY_HAIRCUT.C) * 100}% 하향)`,
  );
  if (a.riskRange && a.riskRange.low < b.npv * 0.5) {
    recommendations.push(
      "시나리오 A는 변동성이 큼 — 보수 케이스 보장 필요 시 B(고정가격) 고려",
    );
  }
  if (c.npv > 0 && c.npv > d.npv * 1.2) {
    recommendations.push(
      "시나리오 C가 매력적이지만 정책 미확정 — 정부 발표 확인 후 실제 채택",
    );
  }
  if (d.contractYears < 15 && a.npv > d.npv) {
    recommendations.push(
      "직접 PPA 계약기간이 짧음 — 장기 안정성 위해 B/C 비교 권장",
    );
  }

  return {
    scenarios: { A: a, B: b, C: c, D: d },
    sensitivity,
    bestScenario,
    recommendations,
    explanation: {
      winner: bestScenario,
      primaryReasons,
      comparison,
      caveats,
    },
  };
}
