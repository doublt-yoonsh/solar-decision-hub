import { describe, it, expect } from "vitest";

import {
  analyzePortfolio,
  hhiByRegion,
  hhiByGrid,
  diversityScore,
} from "./index";
import { computePolicyRisk } from "./policyRisk";
import type {
  PlantInput,
  SiteType,
  CurrentScenario,
} from "../types/PlantInput";

function plantFx(
  id: string,
  sido: string,
  sigungu: string,
  capacityKw: number,
  siteType: SiteType = "general",
  currentScenario?: CurrentScenario,
): PlantInput {
  return {
    id,
    capacityKw,
    siteType,
    location: {
      address: `${sido} ${sigungu}`,
      lat: 35,
      lng: 127,
      region: { sido, sigungu },
    },
    ...(currentScenario ? { currentScenario } : {}),
  };
}

describe("hhiByRegion / hhiByGrid", () => {
  it("동일 지역 5개 → 10000", () => {
    const plants = [1, 2, 3, 4, 5].map((i) =>
      plantFx(`p${i}`, "전라남도", "영광군", 100),
    );
    expect(hhiByRegion(plants)).toBe(10000);
    expect(hhiByGrid(plants)).toBe(10000);
  });

  it("4개 동등 지역 분산 → 2500", () => {
    const plants = [
      plantFx("a", "서울특별시", "중구", 100),
      plantFx("b", "전라남도", "영광군", 100),
      plantFx("c", "경상북도", "경주시", 100),
      plantFx("d", "충청남도", "당진시", 100),
    ];
    expect(hhiByRegion(plants)).toBe(2500);
  });

  it("본토 + 제주 50/50 → grid HHI 5000", () => {
    const plants = [
      plantFx("a", "전라남도", "영광군", 100),
      plantFx("b", "제주특별자치도", "제주시", 100),
    ];
    expect(hhiByGrid(plants)).toBe(5000);
  });

  it("빈 배열 → 0", () => {
    expect(hhiByRegion([])).toBe(0);
  });
});

describe("diversityScore", () => {
  it("단일 발전소 → 0", () => {
    expect(
      diversityScore([plantFx("p", "전라남도", "영광군", 100)]),
    ).toBe(0);
  });

  it("모두 동일 클래스 → 0", () => {
    const plants = [1, 2, 3].map((i) =>
      plantFx(`p${i}`, "전라남도", "영광군", 100),
    );
    expect(diversityScore(plants)).toBe(0);
  });

  it("모두 다른 클래스 → 1에 가까움", () => {
    const plants = [
      plantFx("a", "서울특별시", "중구", 100, "general"),
      plantFx("b", "전라남도", "영광군", 100, "building"),
      plantFx("c", "제주특별자치도", "제주시", 100, "forest"),
    ];
    expect(diversityScore(plants)).toBeCloseTo(1, 4);
  });
});

describe("computePolicyRisk", () => {
  it("100% A → totalScore = 30 (A) + 30 (sunset 절반) = 45", () => {
    const plants = [plantFx("a", "전라남도", "영광군", 100, "general", "A")];
    const r = computePolicyRisk(plants);
    expect(r.components.scenarioAExposure).toBe(30);
    expect(r.components.scenarioCExposure).toBe(0);
    expect(r.components.sunsetTimingRisk).toBe(15); // 0.5 share × 30
    expect(r.totalScore).toBe(45);
    expect(r.formulaVersion).toBe("v1.0");
  });

  it("100% B → A/C exposure 0, sunset만 15", () => {
    const plants = [plantFx("a", "전라남도", "영광군", 100, "general", "B")];
    const r = computePolicyRisk(plants);
    expect(r.components.scenarioAExposure).toBe(0);
    expect(r.components.scenarioCExposure).toBe(0);
    expect(r.totalScore).toBe(15);
  });

  it("100% C → C exposure 40", () => {
    const plants = [plantFx("a", "전라남도", "영광군", 100, "general", "C")];
    const r = computePolicyRisk(plants);
    expect(r.components.scenarioCExposure).toBe(40);
    expect(r.totalScore).toBe(55);
  });

  it("빈 portfolio → 0점", () => {
    const r = computePolicyRisk([]);
    expect(r.totalScore).toBe(0);
  });
});

describe("analyzePortfolio — 단일 모드", () => {
  it("단일 발전소: policyRisk 점수 40~60 (A 디폴트)", () => {
    const r = analyzePortfolio([
      plantFx("p1", "전라남도", "영광군", 99),
    ]);
    expect(r.policyRisk.totalScore).toBeGreaterThanOrEqual(40);
    expect(r.policyRisk.totalScore).toBeLessThanOrEqual(60);
    expect(r.totalCapacityKw).toBe(99);
  });
});

describe("analyzePortfolio — 분산 5개", () => {
  it("policyRisk 70 미만 (시나리오 다양화)", () => {
    const plants = [
      plantFx("p1", "전라남도", "영광군", 99, "general", "B"),
      plantFx("p2", "경상북도", "경주시", 500, "building", "B"),
      plantFx("p3", "강원도", "강릉시", 250, "general", "B"),
      plantFx("p4", "제주특별자치도", "제주시", 99, "general", "D"),
      plantFx("p5", "충청남도", "당진시", 1000, "building", "B"),
    ];
    const r = analyzePortfolio(plants);
    expect(r.policyRisk.totalScore).toBeLessThan(70);
    expect(r.concentrationByRegion).toBeLessThan(5000);
  });
});

describe("analyzePortfolio — 같은 지역 5개", () => {
  it("지역 HHI 10000 + diversify 권고", () => {
    const plants = [1, 2, 3, 4, 5].map((i) =>
      plantFx(`p${i}`, "전라남도", "영광군", 100, "general", "A"),
    );
    const r = analyzePortfolio(plants);
    expect(r.concentrationByRegion).toBe(10000);
    const types = r.recommendations.map((rec) => rec.type);
    expect(types).toContain("diversify");
  });
});

describe("analyzePortfolio — reproducibility", () => {
  it("같은 입력 → 같은 결과", () => {
    const plants = [plantFx("p1", "전라남도", "영광군", 99)];
    const a = analyzePortfolio(plants);
    const b = analyzePortfolio(plants);
    expect(a.totalAnnualRevenue).toBe(b.totalAnnualRevenue);
    expect(a.policyRisk.totalScore).toBe(b.policyRisk.totalScore);
  });
});
