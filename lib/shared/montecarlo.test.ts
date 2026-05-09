import { describe, it, expect } from "vitest";

import { mulberry32, simulate, aggregate, normal } from "./montecarlo";

describe("mulberry32", () => {
  it("same seed → same sequence", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it("different seeds → different first values", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("values lie in [0, 1)", () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("simulate", () => {
  it("calls fn `iterations` times", () => {
    const out = simulate(5, 7, () => 1);
    expect(out).toHaveLength(5);
  });

  it("identical seed → identical results", () => {
    const a = simulate(10, 99, (r) => r());
    const b = simulate(10, 99, (r) => r());
    expect(a).toEqual(b);
  });
});

describe("aggregate", () => {
  it("passes results into aggregator", () => {
    const sum = aggregate([1, 2, 3], (a) => a.reduce((s, x) => s + x, 0));
    expect(sum).toBe(6);
  });
});

describe("normal (seeded)", () => {
  it("mean of large sample close to target mean", () => {
    const rng = mulberry32(2025);
    const samples: number[] = [];
    for (let i = 0; i < 5000; i++) samples.push(normal(rng, 100, 10));
    const m = samples.reduce((s, v) => s + v, 0) / samples.length;
    expect(Math.abs(m - 100)).toBeLessThan(1.5);
  });
});
