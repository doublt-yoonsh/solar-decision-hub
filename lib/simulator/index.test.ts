import { describe, it, expect } from "vitest";

import { simulate } from "./index";
import type { PlantInput } from "../types/PlantInput";

interface DemoFixture {
  label: string;
  plant: PlantInput;
}

const FIXTURES: DemoFixture[] = [
  {
    label: "서울 99kW 일반",
    plant: {
      id: "seoul",
      capacityKw: 99,
      siteType: "general",
      location: {
        address: "서울특별시 중구 세종대로 110",
        lat: 37.5665,
        lng: 126.978,
        region: { sido: "서울특별시", sigungu: "중구" },
      },
    },
  },
  {
    label: "영광 99kW 일반",
    plant: {
      id: "yeonggwang",
      capacityKw: 99,
      siteType: "general",
      location: {
        address: "전라남도 영광군 백수읍 백수해안로 1",
        lat: 35.2773,
        lng: 126.4181,
        region: { sido: "전라남도", sigungu: "영광군" },
      },
    },
  },
  {
    label: "제주 99kW 일반",
    plant: {
      id: "jeju",
      capacityKw: 99,
      siteType: "general",
      location: {
        address: "제주특별자치도 제주시 첨단로 242",
        lat: 33.4996,
        lng: 126.5312,
        region: { sido: "제주특별자치도", sigungu: "제주시" },
      },
    },
  },
  {
    label: "당진 500kW 건축물",
    plant: {
      id: "dangjin",
      capacityKw: 500,
      siteType: "building",
      location: {
        address: "충청남도 당진시 송산면 송산로 100",
        lat: 36.8893,
        lng: 126.6286,
        region: { sido: "충청남도", sigungu: "당진시" },
      },
    },
  },
  {
    label: "경주 3MW 일반",
    plant: {
      id: "gyeongju",
      capacityKw: 3000,
      siteType: "general",
      location: {
        address: "경상북도 경주시 산내면 의곡길 50",
        lat: 35.7858,
        lng: 129.2231,
        region: { sido: "경상북도", sigungu: "경주시" },
      },
    },
  },
];

describe("simulate (integration)", () => {
  for (const fx of FIXTURES) {
    it(`${fx.label}: 4 scenarios all numeric, bestScenario in A..D`, () => {
      const r = simulate({ plant: fx.plant, iterations: 50, seed: 42 });
      expect(Number.isFinite(r.scenarios.A.npv)).toBe(true);
      expect(Number.isFinite(r.scenarios.B.npv)).toBe(true);
      expect(Number.isFinite(r.scenarios.C.npv)).toBe(true);
      expect(Number.isFinite(r.scenarios.D.npv)).toBe(true);
      expect(["A", "B", "C", "D"]).toContain(r.bestScenario);
      expect(r.recommendations.length).toBeGreaterThan(0);
    });
  }

  it("reproducibility: same seed → same NPV across all scenarios", () => {
    const input = { plant: FIXTURES[0]!.plant, iterations: 50, seed: 42 };
    const a = simulate(input);
    const b = simulate(input);
    expect(a.scenarios.A.npv).toBe(b.scenarios.A.npv);
    expect(a.scenarios.B.npv).toBe(b.scenarios.B.npv);
    expect(a.scenarios.C.npv).toBe(b.scenarios.C.npv);
    expect(a.scenarios.D.npv).toBe(b.scenarios.D.npv);
    expect(a.bestScenario).toBe(b.bestScenario);
  });

  it("당진 500kW: 4개 시나리오 NPV 모두 양수", () => {
    const r = simulate({ plant: FIXTURES[3]!.plant, iterations: 50, seed: 42 });
    expect(r.scenarios.A.npv).toBeGreaterThan(0);
    expect(r.scenarios.B.npv).toBeGreaterThan(0);
    expect(r.scenarios.C.npv).toBeGreaterThan(0);
    expect(r.scenarios.D.npv).toBeGreaterThan(0);
  });

  it("경주 3MW: 시나리오 A 첫해 매출 4억~7억원 (도메인 sanity)", () => {
    const r = simulate({ plant: FIXTURES[4]!.plant, iterations: 50, seed: 42 });
    const firstYear = r.scenarios.A.yearlyBreakdown[0]!.totalRevenue;
    expect(firstYear).toBeGreaterThan(400_000_000);
    expect(firstYear).toBeLessThan(900_000_000);
  });
});
