import { describe, it, expect } from "vitest";

import { npv, irr, paybackPeriod } from "./finance";

describe("npv", () => {
  it("zero discount returns sum", () => {
    expect(npv([100, 200, 300], 0)).toBeCloseTo(600, 6);
  });

  it("classic textbook: −1000 + 500/1.1 + 600/1.21 ≈ −49.59", () => {
    expect(npv([-1000, 500, 600], 0.1)).toBeCloseTo(-49.59, 2);
  });

  it("empty cashflows returns 0", () => {
    expect(npv([], 0.1)).toBe(0);
  });

  it("higher discount rate lowers NPV for positive future flows", () => {
    expect(npv([0, 100], 0.05)).toBeGreaterThan(npv([0, 100], 0.2));
  });
});

describe("irr", () => {
  it("textbook: [-1000, 500, 500, 500] → ~23.38%", () => {
    expect(irr([-1000, 500, 500, 500])).toBeCloseTo(0.2338, 3);
  });

  it("two-period: [-100, 110] → 10%", () => {
    expect(irr([-100, 110])).toBeCloseTo(0.1, 4);
  });
});

describe("paybackPeriod", () => {
  it("exact integer payback", () => {
    expect(paybackPeriod([100, 100, 100, 100], 200)).toBeCloseTo(2, 6);
  });

  it("fractional payback", () => {
    expect(paybackPeriod([100, 100, 100], 150)).toBeCloseTo(1.5, 6);
  });

  it("never repaid → Infinity", () => {
    expect(paybackPeriod([10, 10], 1000)).toBe(Infinity);
  });

  it("zero capex returns 0", () => {
    expect(paybackPeriod([10, 10], 0)).toBe(0);
  });
});
