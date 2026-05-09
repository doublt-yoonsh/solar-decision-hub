import { describe, it, expect } from "vitest";

import { runSensitivity } from "./sensitivity";
import type { PlantInput } from "../types/PlantInput";

const plant: PlantInput = {
  id: "p",
  capacityKw: 99,
  siteType: "general",
  location: {
    address: "전라남도 영광군 백수읍 백수해안로 1",
    lat: 35.2773,
    lng: 126.4181,
    region: { sido: "전라남도", sigungu: "영광군" },
  },
};

describe("runSensitivity — A", () => {
  it("includes smp + discountRate + curtailmentRate", () => {
    const r = runSensitivity("A", { plant, iterations: 30, seed: 1 });
    const names = r.variables.map((v) => v.variable);
    expect(names).toContain("smp");
    expect(names).toContain("discountRate");
    expect(names).toContain("curtailmentRate");
  });

  it("npvHigh >= npvLow for every variable", () => {
    const r = runSensitivity("A", { plant, iterations: 30, seed: 1 });
    for (const v of r.variables) {
      expect(v.npvHigh).toBeGreaterThanOrEqual(v.npvLow);
      expect(v.range).toBeGreaterThanOrEqual(0);
    }
  });

  it("variables sorted by range descending", () => {
    const r = runSensitivity("A", { plant, iterations: 30, seed: 1 });
    for (let i = 1; i < r.variables.length; i++) {
      expect(r.variables[i - 1]!.range).toBeGreaterThanOrEqual(
        r.variables[i]!.range,
      );
    }
  });
});

describe("runSensitivity — B", () => {
  it("includes smp variable", () => {
    const r = runSensitivity("B", { plant });
    const names = r.variables.map((v) => v.variable);
    expect(names).toContain("smp");
  });
});

describe("runSensitivity — C, D", () => {
  it("C: smp variable absent (fixed unit price)", () => {
    const r = runSensitivity("C", { plant });
    expect(r.variables.map((v) => v.variable)).not.toContain("smp");
  });
  it("D: smp variable absent (PPA fixed)", () => {
    const r = runSensitivity("D", { plant });
    expect(r.variables.map((v) => v.variable)).not.toContain("smp");
  });
});
