import { describe, it, expect } from "vitest";

import { simulateScenarioC } from "./C";
import type { PlantInput } from "../../types/PlantInput";

function plantFx(overrides: Partial<PlantInput> = {}): PlantInput {
  return {
    id: "p-C",
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

describe("simulateScenarioC — sanity", () => {
  it("contractYears 디폴트 20", () => {
    const r = simulateScenarioC({ plant: plantFx() });
    expect(r.contractYears).toBe(20);
  });

  it("contractYears slider 15 / 25 적용", () => {
    expect(
      simulateScenarioC({
        plant: plantFx(),
        scenarioCOptions: { contractYears: 15 },
      }).contractYears,
    ).toBe(15);
    expect(
      simulateScenarioC({
        plant: plantFx(),
        scenarioCOptions: { contractYears: 25 },
      }).contractYears,
    ).toBe(25);
  });

  it("시작연도 = 2027", () => {
    const r = simulateScenarioC({ plant: plantFx() });
    expect(r.yearlyBreakdown[0]!.year).toBe(2027);
  });
});

describe("simulateScenarioC — pricing", () => {
  it("디폴트 130원/kWh", () => {
    const r = simulateScenarioC({ plant: plantFx() });
    if (r.assumptions.scenario !== "C") return;
    expect(r.assumptions.assumedUnitPrice).toBeCloseTo(130, 6);
  });

  it("policyRiskFactor 0.85 → 단가 0.85배", () => {
    const r = simulateScenarioC({
      plant: plantFx(),
      scenarioCOptions: { policyRiskFactor: 0.85 },
    });
    if (r.assumptions.scenario !== "C") return;
    expect(r.assumptions.assumedUnitPrice).toBeCloseTo(130 * 0.85, 6);
  });

  it("newAuctionPrice 200 + policyRiskFactor 0.5 = 100", () => {
    const r = simulateScenarioC({
      plant: plantFx(),
      scenarioCOptions: { newAuctionPrice: 200, policyRiskFactor: 0.5 },
    });
    if (r.assumptions.scenario !== "C") return;
    expect(r.assumptions.assumedUnitPrice).toBeCloseTo(100, 6);
  });
});

describe("simulateScenarioC — REC unavailable in this scenario", () => {
  it("recAvailable=false everywhere, smpRevenue=0, recRevenue=0", () => {
    const r = simulateScenarioC({ plant: plantFx() });
    for (const yb of r.yearlyBreakdown) {
      expect(yb.recAvailable).toBe(false);
      expect(yb.smpRevenue).toBe(0);
      expect(yb.recRevenue).toBe(0);
      expect(yb.auctionRevenue).toBeGreaterThan(0);
    }
  });
});
