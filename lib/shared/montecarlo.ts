// /lib/shared/montecarlo.ts
// Tiny seeded Monte Carlo helpers. Same seed → same sequence — required for
// deterministic test fixtures.

/**
 * mulberry32 — 32-bit seeded PRNG, period 2^32.
 * Source: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 * Returns a closure that yields uniform numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Run `fn` `iterations` times with a seeded RNG passed in.
 * `fn` should consume the RNG for any randomness so results are reproducible.
 */
export function simulate<T>(
  iterations: number,
  seed: number,
  fn: (rng: () => number) => T,
): T[] {
  const rng = mulberry32(seed);
  const results: T[] = [];
  for (let i = 0; i < iterations; i++) {
    results.push(fn(rng));
  }
  return results;
}

/** Aggregator helper — passes the sample array straight to `aggregator`. */
export function aggregate<T, U>(
  results: T[],
  aggregator: (results: T[]) => U,
): U {
  return aggregator(results);
}

/**
 * Convenience: draw a normal (Gaussian) sample via Box–Muller.
 * Caller supplies the RNG so the seed remains in their control.
 */
export function normal(rng: () => number, mean: number, sd: number): number {
  // Avoid log(0) by clamping.
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * sd;
}
