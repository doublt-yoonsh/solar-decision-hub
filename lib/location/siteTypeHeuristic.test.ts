import { describe, it, expect } from "vitest";

import {
  inferSiteType,
  HEURISTIC_TEST_CASES,
} from "./siteTypeHeuristic";

describe("inferSiteType — fixture cases", () => {
  for (const tc of HEURISTIC_TEST_CASES) {
    it(`[${tc.ruleHint}] "${tc.input}" → ${tc.expected}`, () => {
      const hint = inferSiteType(tc.input);
      expect(hint.inferred).toBe(tc.expected);
      expect(hint.sourceMeta.source).toBe("fallback");
      expect(hint.reason).toBeTruthy();
    });
  }
});

describe("inferSiteType — defensive defaults", () => {
  it("empty string falls back to 'general' with low confidence", () => {
    const hint = inferSiteType("");
    expect(hint.inferred).toBe("general");
    expect(hint.confidence).toBe("low");
  });

  it("returns confidence='medium' for clear forest match", () => {
    const hint = inferSiteType("강원도 정선군 화암면 산 45-1");
    expect(hint.inferred).toBe("forest");
    expect(hint.confidence).toBe("medium");
  });
});
