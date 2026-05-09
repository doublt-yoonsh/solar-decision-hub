import { describe, it, expect } from "vitest";

import { simulateScenarioA } from "./A";
import type { SimulatorInput } from "../types";
import type { PlantInput } from "../../types/PlantInput";

function plantFx(overrides: Partial<PlantInput> = {}): PlantInput {
  return {
    id: "p-A",
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

describe("simulateScenarioA — sanity ranges", () => {
  it("99kW 영광 일반부지: 첫해 매출 1.5천만원~3.5천만원", () => {
    const r = simulateScenarioA({
      plant: plantFx(),
      seed: 42,
      iterations: 100,
    });
    const firstYear = r.yearlyBreakdown[0]!.totalRevenue;
    expect(firstYear).toBeGreaterThan(15_000_000);
    expect(firstYear).toBeLessThan(35_000_000);
  });

  it("contractYears = 20, yearlyBreakdown 길이 20", () => {
    const r = simulateScenarioA({ plant: plantFx(), iterations: 5 });
    expect(r.contractYears).toBe(20);
    expect(r.yearlyBreakdown).toHaveLength(20);
  });
});

describe("simulateScenarioA — RPS sunset", () => {
  it("recSunsetYear 이후 recRevenue=0 + recAvailable=false + recReason 명시", () => {
    const r = simulateScenarioA({
      plant: plantFx(),
      seed: 1,
      iterations: 5,
      recSunsetYear: 2027,
    });
    const after = r.yearlyBreakdown.filter((b) => b.year >= 2027);
    expect(after.length).toBeGreaterThan(0);
    for (const yb of after) {
      expect(yb.recRevenue).toBe(0);
      expect(yb.recAvailable).toBe(false);
      expect(yb.recReason).toMatch(/RPS sunset/);
    }
  });

  it("sunset 전 해는 recRevenue > 0", () => {
    const r = simulateScenarioA({
      plant: plantFx(),
      seed: 1,
      iterations: 5,
      recSunsetYear: 2027,
    });
    const before = r.yearlyBreakdown.filter((b) => b.year < 2027);
    for (const yb of before) {
      expect(yb.recRevenue).toBeGreaterThan(0);
      expect(yb.recAvailable).toBe(true);
    }
  });
});

describe("simulateScenarioA — reproducibility", () => {
  it("동일 seed → 동일 NPV, totalRevenue, riskRange", () => {
    const input: SimulatorInput = {
      plant: plantFx(),
      seed: 7,
      iterations: 50,
    };
    const a = simulateScenarioA(input);
    const b = simulateScenarioA(input);
    expect(a.npv).toBe(b.npv);
    expect(a.totalRevenue).toBe(b.totalRevenue);
    expect(a.riskRange).toEqual(b.riskRange);
  });
});

describe("simulateScenarioA — riskRange ordering", () => {
  it("low <= mid <= high", () => {
    const r = simulateScenarioA({
      plant: plantFx(),
      seed: 9,
      iterations: 200,
    });
    expect(r.riskRange).toBeDefined();
    expect(r.riskRange!.low).toBeLessThanOrEqual(r.riskRange!.mid);
    expect(r.riskRange!.mid).toBeLessThanOrEqual(r.riskRange!.high);
  });
});

describe("simulateScenarioA — applied assumptions", () => {
  it("scenario='A' + appliedWeight 일치", () => {
    const r = simulateScenarioA({
      plant: plantFx(),
      seed: 3,
      iterations: 5,
    });
    expect(r.assumptions.scenario).toBe("A");
    if (r.assumptions.scenario !== "A") return;
    expect(r.assumptions.appliedWeight).toBe(1.2); // 일반 < 100kW
    expect(r.assumptions.recPriceTrend).toHaveLength(20);
  });
});
