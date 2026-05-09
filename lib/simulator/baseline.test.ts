import { describe, it, expect } from "vitest";

import {
  calculateGeneration,
  curtailmentRegionKey,
  annualOpex,
  SIMULATOR_DEFAULTS,
} from "./baseline";
import type { SimulatorInput } from "./types";
import type { PlantInput } from "../types/PlantInput";

function plantFixture(overrides: Partial<PlantInput> = {}): PlantInput {
  return {
    id: "p-test",
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

describe("calculateGeneration", () => {
  it("99kW 영광: 첫해 발전량 120~150 MWh 범위", () => {
    const input: SimulatorInput = { plant: plantFixture() };
    const series = calculateGeneration(input, 20, 2026);
    expect(series).toHaveLength(20);
    const firstMwh = series[0]!.generationKwh / 1000;
    expect(firstMwh).toBeGreaterThan(120);
    expect(firstMwh).toBeLessThan(150);
  });

  it("연 0.5% 열화 → 20년차 ≈ 90.91% × 1년차", () => {
    const series = calculateGeneration({ plant: plantFixture() }, 20, 2026);
    const ratio = series[19]!.generationKwh / series[0]!.generationKwh;
    expect(ratio).toBeCloseTo(Math.pow(0.995, 19), 4);
  });

  it("plant.curtailmentRate 0.05 → effectiveKwh 95% 일치", () => {
    const series = calculateGeneration(
      { plant: plantFixture({ curtailmentRate: 0.05 }) },
      1,
      2026,
    );
    expect(series[0]!.effectiveKwh / series[0]!.generationKwh).toBeCloseTo(
      0.95,
      6,
    );
  });

  it("annualKwhPerKw 명시 → regionDefaults 무시", () => {
    const series = calculateGeneration(
      { plant: plantFixture({ capacityKw: 100 }), annualKwhPerKw: 1000 },
      1,
      2026,
    );
    expect(series[0]!.generationKwh).toBeCloseTo(100_000, 0);
  });

  it("PR 0.90 → baseline의 1.125배", () => {
    const baseline = calculateGeneration(
      { plant: plantFixture() },
      1,
      2026,
    )[0]!.generationKwh;
    const boosted = calculateGeneration(
      { plant: plantFixture({ performanceRatio: 0.9 }) },
      1,
      2026,
    )[0]!.generationKwh;
    expect(boosted / baseline).toBeCloseTo(0.9 / SIMULATOR_DEFAULTS.PR, 6);
  });
});

describe("curtailmentRegionKey", () => {
  it("매핑이 권역별로 정확", () => {
    expect(curtailmentRegionKey("제주특별자치도")).toBe("jeju");
    expect(curtailmentRegionKey("전라남도")).toBe("honam");
    expect(curtailmentRegionKey("경상북도")).toBe("yeongnam");
    expect(curtailmentRegionKey("경기도")).toBe("central");
    expect(curtailmentRegionKey("서울특별시")).toBe("central");
    expect(curtailmentRegionKey("외국")).toBe("default");
  });
});

describe("annualOpex", () => {
  it("디폴트: capacityKw × 25000", () => {
    expect(annualOpex(plantFixture({ capacityKw: 100 }))).toBe(2_500_000);
  });

  it("opexPerKwYr 명시 우선", () => {
    expect(
      annualOpex(plantFixture({ capacityKw: 100, opexPerKwYr: 30000 })),
    ).toBe(3_000_000);
  });

  it("opexAnnualOverride가 최우선", () => {
    expect(
      annualOpex(
        plantFixture({
          capacityKw: 100,
          opexPerKwYr: 30000,
          opexAnnualOverride: 1_234_567,
        }),
      ),
    ).toBe(1_234_567);
  });
});
