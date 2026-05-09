import { describe, it, expect } from "vitest";

import { analyzeBenchmark } from "./index";
import { generatePeers } from "./peerGenerator";
import type { PlantInput } from "../types/PlantInput";

function plantFx(overrides: Partial<PlantInput> = {}): PlantInput {
  return {
    id: "subject",
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

describe("generatePeers — deterministic", () => {
  it("same seed → identical pool", () => {
    const a = generatePeers(100, 7);
    const b = generatePeers(100, 7);
    expect(a).toEqual(b);
  });

  it("different seeds → different pools", () => {
    const a = generatePeers(50, 1);
    const b = generatePeers(50, 2);
    expect(a[0]).not.toEqual(b[0]);
  });

  it("filter narrows pool", () => {
    const all = generatePeers(1000, 42);
    const onlyJeju = generatePeers(1000, 42, { sido: "제주특별자치도" });
    expect(onlyJeju.length).toBeGreaterThan(0);
    expect(onlyJeju.length).toBeLessThan(all.length);
  });
});

describe("analyzeBenchmark — sanity ranges", () => {
  it("99kW 영광 → percentile 5..95", () => {
    const r = analyzeBenchmark(plantFx());
    expect(r.efficiencyPercentile).toBeGreaterThanOrEqual(5);
    expect(r.efficiencyPercentile).toBeLessThanOrEqual(95);
    expect(r.genPercentile).toBeGreaterThanOrEqual(5);
    expect(r.genPercentile).toBeLessThanOrEqual(95);
  });

  it("peerCount > 0 even with strict stratum (fallback works)", () => {
    const r = analyzeBenchmark(plantFx({ capacityKw: 99 }));
    expect(r.peerCount).toBeGreaterThan(0);
  });

  it("stratification level lands at one of the four expected values", () => {
    const r = analyzeBenchmark(plantFx());
    expect(["sido+site+cap", "sido+site", "sido", "all"]).toContain(
      r.stratification.level,
    );
  });
});

describe("analyzeBenchmark — reproducibility", () => {
  it("same seed → same percentile + peerCount", () => {
    const a = analyzeBenchmark(plantFx(), 42);
    const b = analyzeBenchmark(plantFx(), 42);
    expect(a.efficiencyPercentile).toBe(b.efficiencyPercentile);
    expect(a.genPercentile).toBe(b.genPercentile);
    expect(a.peerCount).toBe(b.peerCount);
  });
});

describe("analyzeBenchmark — PR effect", () => {
  it("PR 0.90 (above baseline) → efficiency percentile higher than PR 0.75", () => {
    const high = analyzeBenchmark(plantFx({ performanceRatio: 0.9 }));
    const low = analyzeBenchmark(plantFx({ performanceRatio: 0.75 }));
    expect(high.efficiencyPercentile).toBeGreaterThan(low.efficiencyPercentile);
  });
});
