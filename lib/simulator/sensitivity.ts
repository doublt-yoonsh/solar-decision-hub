// /lib/simulator/sensitivity.ts
// Tornado-style sensitivity. For each variable we re-run the scenario at
// −delta and +delta vs baseline and capture the NPV swing.

import { avgSmpMain12m } from "../data";
import type { ScenarioId } from "../types/ScenarioResult";
import { simulateScenarioA } from "./scenarios/A";
import { simulateScenarioB } from "./scenarios/B";
import { simulateScenarioC } from "./scenarios/C";
import { simulateScenarioD } from "./scenarios/D";
import type { SimulatorInput } from "./types";

export type SensitivityVariableId =
  | "smp"
  | "discountRate"
  | "curtailmentRate";

export interface SensitivityVariable {
  variable: SensitivityVariableId;
  /** Magnitude of the perturbation applied (absolute or fractional, see notes). */
  delta: number;
  npvLow: number;
  npvHigh: number;
  /** |high − low| — used to rank variables in tornado chart. */
  range: number;
}

export interface SensitivityResult {
  scenario: ScenarioId;
  baselineNpv: number;
  variables: SensitivityVariable[];
}

const SENS = {
  smp: 0.2, // ±20% on mean SMP / smpBaseValue
  discountRate: 0.02, // ±2 percentage points
  curtailment: 0.1, // ±10 percentage points (clamped to >= 0)
} as const;

function runOne(scenario: ScenarioId, input: SimulatorInput): number {
  switch (scenario) {
    case "A":
      return simulateScenarioA(input).npv;
    case "B":
      return simulateScenarioB(input).npv;
    case "C":
      return simulateScenarioC(input).npv;
    case "D":
      return simulateScenarioD(input).npv;
  }
}

function makeVar(
  id: SensitivityVariableId,
  delta: number,
  low: number,
  high: number,
): SensitivityVariable {
  const npvLow = Math.min(low, high);
  const npvHigh = Math.max(low, high);
  return { variable: id, delta, npvLow, npvHigh, range: npvHigh - npvLow };
}

export function runSensitivity(
  scenario: ScenarioId,
  input: SimulatorInput,
): SensitivityResult {
  const baseline = runOne(scenario, input);
  const variables: SensitivityVariable[] = [];

  // -- Discount rate: ±2pp ----------------------------------------------
  const baseDiscount = input.discountRate ?? 0.05;
  const dLow = runOne(scenario, {
    ...input,
    discountRate: baseDiscount + SENS.discountRate,
  });
  const dHigh = runOne(scenario, {
    ...input,
    discountRate: Math.max(0.001, baseDiscount - SENS.discountRate),
  });
  variables.push(makeVar("discountRate", SENS.discountRate, dLow, dHigh));

  // -- Curtailment rate: ±10pp clamped to [0, 1] ------------------------
  const baseCurtailment = input.plant.curtailmentRate ?? 0;
  const cLow = runOne(scenario, {
    ...input,
    plant: {
      ...input.plant,
      curtailmentRate: Math.min(1, baseCurtailment + SENS.curtailment),
    },
  });
  const cHigh = runOne(scenario, {
    ...input,
    plant: {
      ...input.plant,
      curtailmentRate: Math.max(0, baseCurtailment - SENS.curtailment),
    },
  });
  variables.push(makeVar("curtailmentRate", SENS.curtailment, cLow, cHigh));

  // -- SMP: ±20% — applies to A (meanSmp) and B (smpBaseValue) ----------
  if (scenario === "A") {
    const baseMean = input.meanSmpOverride ?? avgSmpMain12m();
    const sLow = runOne("A", {
      ...input,
      meanSmpOverride: baseMean * (1 - SENS.smp),
    });
    const sHigh = runOne("A", {
      ...input,
      meanSmpOverride: baseMean * (1 + SENS.smp),
    });
    variables.push(makeVar("smp", SENS.smp, sLow, sHigh));
  } else if (scenario === "B") {
    const baseSmpBase = input.scenarioBOptions?.smpBaseValueOverride ?? 80;
    const sLow = runOne("B", {
      ...input,
      scenarioBOptions: {
        ...input.scenarioBOptions,
        smpBaseValueOverride: baseSmpBase * (1 - SENS.smp),
      },
    });
    const sHigh = runOne("B", {
      ...input,
      scenarioBOptions: {
        ...input.scenarioBOptions,
        smpBaseValueOverride: baseSmpBase * (1 + SENS.smp),
      },
    });
    variables.push(makeVar("smp", SENS.smp, sLow, sHigh));
  }
  // Scenarios C, D: SMP doesn't apply (fixed contract prices), variable omitted.

  // Sort by range desc — tornado chart top entries are highest impact.
  variables.sort((a, b) => b.range - a.range);

  return { scenario, baselineNpv: baseline, variables };
}
