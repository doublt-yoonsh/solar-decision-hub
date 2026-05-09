// /lib/shared/statistics.ts
// Pure statistics helpers. All functions tolerate empty arrays gracefully.

/** Arithmetic mean; returns 0 for empty input. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

/** Population standard deviation; returns 0 for empty/uniform input. */
export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  let sumSq = 0;
  for (const v of values) sumSq += (v - m) * (v - m);
  return Math.sqrt(sumSq / values.length);
}

/**
 * Percentile via linear interpolation (matches R type 7 / numpy default).
 * `p` in [0, 100]. Returns 0 for empty input.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * (p / 100);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

/**
 * Herfindahl–Hirschman Index. `shares` are 0..1 fractions. Returns 0..10000.
 * Common interpretation:
 *   < 1500   unconcentrated
 *   1500–2500 moderate
 *   > 2500   high concentration
 */
export function hhi(shares: number[]): number {
  let sum = 0;
  for (const s of shares) sum += s * s;
  return sum * 10000;
}

/** Min/max safe — returns Infinity / -Infinity for empty arrays. */
export function min(values: number[]): number {
  let m = Infinity;
  for (const v of values) if (v < m) m = v;
  return m;
}

export function max(values: number[]): number {
  let m = -Infinity;
  for (const v of values) if (v > m) m = v;
  return m;
}
