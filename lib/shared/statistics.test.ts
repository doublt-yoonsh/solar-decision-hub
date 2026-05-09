import { describe, it, expect } from "vitest";

import { mean, stdDev, percentile, hhi, min, max } from "./statistics";

describe("mean", () => {
  it("basic", () => expect(mean([1, 2, 3])).toBe(2));
  it("empty → 0", () => expect(mean([])).toBe(0));
});

describe("stdDev", () => {
  it("uniform → 0", () => expect(stdDev([5, 5, 5])).toBe(0));
  it("[1..5] → sqrt(2)", () => {
    expect(stdDev([1, 2, 3, 4, 5])).toBeCloseTo(Math.sqrt(2), 6);
  });
  it("empty → 0", () => expect(stdDev([])).toBe(0));
});

describe("percentile", () => {
  it("p=50 of odd-length sorted = median", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });
  it("p=0 = min, p=100 = max", () => {
    expect(percentile([5, 1, 3], 0)).toBe(1);
    expect(percentile([5, 1, 3], 100)).toBe(5);
  });
  it("p=25 of [1,2,3,4] interpolates to 1.75", () => {
    expect(percentile([4, 1, 3, 2], 25)).toBeCloseTo(1.75, 6);
  });
  it("empty → 0", () => expect(percentile([], 50)).toBe(0));
});

describe("hhi", () => {
  it("monopoly → 10000", () => expect(hhi([1])).toBe(10000));
  it("4 equal players → 2500", () => {
    expect(hhi([0.25, 0.25, 0.25, 0.25])).toBe(2500);
  });
  it("empty → 0", () => expect(hhi([])).toBe(0));
});

describe("min/max", () => {
  it("non-empty", () => {
    expect(min([3, 1, 2])).toBe(1);
    expect(max([3, 1, 2])).toBe(3);
  });
  it("empty min/max", () => {
    expect(min([])).toBe(Infinity);
    expect(max([])).toBe(-Infinity);
  });
});
