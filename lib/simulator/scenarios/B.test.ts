import { describe, it, expect } from "vitest";

import { simulateScenarioB } from "./B";
import { simulateScenarioA } from "./A";
import type { SimulatorInput } from "../types";
import type { PlantInput } from "../../types/PlantInput";

function plantFx(overrides: Partial<PlantInput> = {}): PlantInput {
  return {
    id: "p-B",
    capacityKw: 99,
    siteType: "general",
    location: {
      address: "전라남도 영광군 백수읍 백수해안로 1",
      lat: 35.2773,
      lng: 126.4181,
      region: { sido: "전라남도", sigungu: "영광군" },
    },
    ...overrides,
  };
}

describe("simulateScenarioB — sanity", () => {
  it("99kW 영광: 첫해 매출 1.8천만원~3.5천만원", () => {
    const r = simulateScenarioB({ plant: plantFx() });
    const firstYear = r.yearlyBreakdown[0]!.totalRevenue;
    expect(firstYear).toBeGreaterThan(18_000_000);
    expect(firstYear).toBeLessThan(35_000_000);
  });

  it("contractYears = 20, breakdown 20개", () => {
    const r = simulateScenarioB({ plant: plantFx() });
    expect(r.contractYears).toBe(20);
    expect(r.yearlyBreakdown).toHaveLength(20);
  });
});

describe("simulateScenarioB — assumptions", () => {
  it("scenario='B', smpBaseSource='estimated' (시드 데이터 기준)", () => {
    const r = simulateScenarioB({ plant: plantFx() });
    expect(r.assumptions.scenario).toBe("B");
    if (r.assumptions.scenario !== "B") return; // type narrow
    expect(r.assumptions.smpBaseSource).toBe("estimated");
    expect(r.assumptions.contractYears).toBe(20);
  });

  it("smpBaseValueOverride 적용", () => {
    const r = simulateScenarioB({
      plant: plantFx(),
      scenarioBOptions: { smpBaseValueOverride: 90 },
    });
    if (r.assumptions.scenario !== "B") return;
    expect(r.assumptions.smpBaseValue).toBe(90);
  });
});

describe("simulateScenarioB vs A — comparison", () => {
  it("동일 발전소 → A vs B NPV 합리적 차이 (둘 다 양수)", () => {
    const input: SimulatorInput = {
      plant: plantFx(),
      seed: 42,
      iterations: 100,
    };
    const a = simulateScenarioA(input);
    const b = simulateScenarioB(input);
    expect(a.npv).toBeGreaterThan(0);
    expect(b.npv).toBeGreaterThan(0);
    // A is volatile; B is fixed. Difference shouldn't be 100x.
    expect(Math.abs(a.npv - b.npv) / Math.max(a.npv, b.npv)).toBeLessThan(2);
  });
});

describe("simulateScenarioB — reproducibility", () => {
  it("동일 입력 → 동일 결과 (deterministic)", () => {
    const a = simulateScenarioB({ plant: plantFx() });
    const b = simulateScenarioB({ plant: plantFx() });
    expect(a.npv).toBe(b.npv);
    expect(a.totalRevenue).toBe(b.totalRevenue);
  });
});
