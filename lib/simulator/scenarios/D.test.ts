import { describe, it, expect } from "vitest";

import { simulateScenarioD } from "./D";
import type { PlantInput } from "../../types/PlantInput";

function plantFx(overrides: Partial<PlantInput> = {}): PlantInput {
  return {
    id: "p-D",
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

describe("simulateScenarioD — sanity", () => {
  it("99kW 영광 PPA 디폴트: 첫해 매출 1.5천만원~3천만원", () => {
    const r = simulateScenarioD({ plant: plantFx() });
    const firstYear = r.yearlyBreakdown[0]!.totalRevenue;
    expect(firstYear).toBeGreaterThan(15_000_000);
    expect(firstYear).toBeLessThan(30_000_000);
  });

  it("contractYears 디폴트 10", () => {
    const r = simulateScenarioD({ plant: plantFx() });
    expect(r.contractYears).toBe(10);
    expect(r.yearlyBreakdown).toHaveLength(10);
  });
});

describe("simulateScenarioD — pricing breakdown", () => {
  it("ppaRevenue / gridFee 분리, totalRevenue = ppaRevenue − gridFee", () => {
    const r = simulateScenarioD({ plant: plantFx() });
    const yb = r.yearlyBreakdown[0]!;
    expect(yb.ppaRevenue).toBeGreaterThan(0);
    expect(yb.gridFee).toBeGreaterThan(0);
    expect(yb.totalRevenue).toBeCloseTo(yb.ppaRevenue! - yb.gridFee!, 6);
  });

  it("transmissionFee 5원/kWh override → gridFee 그에 비례", () => {
    const r12 = simulateScenarioD({ plant: plantFx() });
    const r5 = simulateScenarioD({
      plant: plantFx(),
      scenarioDOptions: { transmissionFee: 5 },
    });
    expect(r5.yearlyBreakdown[0]!.gridFee!).toBeLessThan(
      r12.yearlyBreakdown[0]!.gridFee!,
    );
  });

  it("re100Premium 20원/kWh 추가 → 매출 증가", () => {
    const base = simulateScenarioD({ plant: plantFx() });
    const premium = simulateScenarioD({
      plant: plantFx(),
      scenarioDOptions: { re100Premium: 20 },
    });
    expect(premium.totalRevenue).toBeGreaterThan(base.totalRevenue);
  });
});

describe("simulateScenarioD — assumptions", () => {
  it("scenario='D', ppaUnitPrice=160 default", () => {
    const r = simulateScenarioD({ plant: plantFx() });
    if (r.assumptions.scenario !== "D") return;
    expect(r.assumptions.ppaUnitPrice).toBe(160);
    expect(r.assumptions.transmissionFee).toBe(12);
    expect(r.assumptions.contractYears).toBe(10);
  });

  it("re100Premium 0이면 assumptions에 미포함", () => {
    const r = simulateScenarioD({ plant: plantFx() });
    if (r.assumptions.scenario !== "D") return;
    expect(r.assumptions.re100Premium).toBeUndefined();
  });
});
