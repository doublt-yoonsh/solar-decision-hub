// /lib/shared/finance.ts
// Pure financial helpers used across simulator/benchmark/portfolio modules.
// All functions are deterministic and side-effect free for easy testing.

/**
 * Net Present Value.
 * NPV = Σ cf_t / (1+r)^t  for t = 0..n-1
 * Convention: cashflows[0] is the t=0 amount (typically −CAPEX; for revenue-
 * only series start at index 0 with `0` and include CAPEX externally).
 */
export function npv(cashflows: number[], discountRate: number): number {
  let sum = 0;
  for (let t = 0; t < cashflows.length; t++) {
    sum += cashflows[t]! / Math.pow(1 + discountRate, t);
  }
  return sum;
}

/**
 * Internal Rate of Return via Newton–Raphson.
 * Returns NaN if not converged after 50 iterations or derivative collapses.
 * Caller should guard with `Number.isFinite`.
 */
export function irr(cashflows: number[], guess = 0.1): number {
  let r = guess;
  for (let i = 0; i < 50; i++) {
    let f = 0;
    let fPrime = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const cf = cashflows[t]!;
      f += cf / Math.pow(1 + r, t);
      if (t > 0) {
        fPrime -= (t * cf) / Math.pow(1 + r, t + 1);
      }
    }
    if (Math.abs(f) < 1e-7) return r;
    if (Math.abs(fPrime) < 1e-12) return NaN;
    const next = r - f / fPrime;
    if (!Number.isFinite(next)) return NaN;
    if (Math.abs(next - r) < 1e-9) return next;
    r = next;
  }
  return NaN;
}

/**
 * Simple payback period (no discounting).
 * `cashflows` are positive yearly net cashflows. Returns the fractional year
 * when cumulative cashflow first reaches CAPEX, or `Infinity` if never repaid.
 */
export function paybackPeriod(cashflows: number[], capex: number): number {
  let cum = 0;
  for (let t = 0; t < cashflows.length; t++) {
    const cf = cashflows[t]!;
    if (cum + cf >= capex) {
      const remaining = capex - cum;
      const fraction = cf > 0 ? remaining / cf : 0;
      return t + fraction;
    }
    cum += cf;
  }
  return Infinity;
}
