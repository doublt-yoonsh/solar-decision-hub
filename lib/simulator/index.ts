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
  /** Plain-Korean recommendations surfaced under the result cards. */
  recommendations: string[];
}

const POLICY_HAIRCUT = { C: 0.85 } as const;

/** Run all 4 scenarios + tornado sensitivity + recommendation summary. */
export function simulate(input: SimulatorInput): SimulationOutput {
  const a = simulateScenarioA(input);
  const b = simulateScenarioB(input);
  const c = simulateScenarioC(input);
  const d = simulateScenarioD(input);

  // Risk-adjusted scores. A uses its 50th-percentile NPV (riskRange.mid).
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

  const sensitivity: Record<ScenarioId, SensitivityResult> = {
    A: runSensitivity("A", input),
    B: runSensitivity("B", input),
    C: runSensitivity("C", input),
    D: runSensitivity("D", input),
  };

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
  };
}
