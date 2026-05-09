// /lib/benchmark/index.ts
// Single-plant benchmarking against a synthetic peer pool.
// All randomness is seeded so results reproduce.

import type { PlantInput } from "../types/PlantInput";
import { regionDefaults, capacityBand } from "../data";
import { mean, stdDev } from "../shared/statistics";
import { generatePeers, type VirtualPeer } from "./peerGenerator";

const PR_BASELINE = 0.8;
const TOTAL_PEERS = 1000;

export interface BenchmarkStratification {
  sido: string;
  siteType: PlantInput["siteType"];
  capacityBand: ReturnType<typeof capacityBand>;
  /** Hierarchy used after fallback: 'sido+site+cap' | 'sido+site' | 'sido' | 'all'. */
  level: "sido+site+cap" | "sido+site" | "sido" | "all";
}

export interface BenchmarkResult {
  plantId: string;
  /** Estimated annual generation (kWh) for the subject plant. */
  estimatedAnnualGen: number;
  /** Generation per kW (kWh/kWp/year) — efficiency metric. */
  genPerKw: number;
  /** Subject's percentile in peer pool by annual generation. 0..100. */
  genPercentile: number;
  /** Subject's percentile in peer pool by efficiency (kWh/kW). 0..100. */
  efficiencyPercentile: number;
  peerCount: number;
  stratification: BenchmarkStratification;
  peerStats: {
    meanKwhPerYear: number;
    stdDevKwhPerYear: number;
    meanKwhPerKw: number;
    stdDevKwhPerKw: number;
  };
}

/** Fallback widening if a strict stratum has too few peers. */
function findPeerPool(
  allPeers: VirtualPeer[],
  sido: string,
  siteType: PlantInput["siteType"],
  band: ReturnType<typeof capacityBand>,
): { peers: VirtualPeer[]; level: BenchmarkStratification["level"] } {
  const minPeers = 30;
  const matchesBand = (p: VirtualPeer): boolean => {
    if (band === "lt100kw") return p.capacityKw < 100;
    if (band === "lt3mw") return p.capacityKw >= 100 && p.capacityKw < 3000;
    return p.capacityKw >= 3000;
  };

  const lvl1 = allPeers.filter(
    (p) => p.sido === sido && p.siteType === siteType && matchesBand(p),
  );
  if (lvl1.length >= minPeers)
    return { peers: lvl1, level: "sido+site+cap" };

  const lvl2 = allPeers.filter(
    (p) => p.sido === sido && p.siteType === siteType,
  );
  if (lvl2.length >= minPeers) return { peers: lvl2, level: "sido+site" };

  const lvl3 = allPeers.filter((p) => p.sido === sido);
  if (lvl3.length >= minPeers) return { peers: lvl3, level: "sido" };

  return { peers: allPeers, level: "all" };
}

function percentileOf(sortedAsc: number[], value: number): number {
  if (sortedAsc.length === 0) return 50;
  let count = 0;
  for (const v of sortedAsc) {
    if (v < value) count++;
    else if (v === value) count += 0.5;
    else break;
  }
  return (count / sortedAsc.length) * 100;
}

/**
 * Benchmark one plant against a seeded synthetic peer pool.
 * Sanity expectation: percentile should not pin to extremes (5..95) for a
 * typical subject in the Korean fleet.
 */
export function analyzeBenchmark(
  input: PlantInput,
  seed = 42,
  totalPeers = TOTAL_PEERS,
): BenchmarkResult {
  const sido = input.location.region.sido;
  const band = capacityBand(input.capacityKw);

  const allPeers = generatePeers(totalPeers, seed);
  const { peers, level } = findPeerPool(allPeers, sido, input.siteType, band);

  // Subject's annual generation under the same model used for peers.
  const sidoBaseline =
    (
      regionDefaults.bySido as Record<
        string,
        { annualKwhPerKw: number } | undefined
      >
    )[sido]?.annualKwhPerKw ?? regionDefaults.default.annualKwhPerKw;
  const pr = input.performanceRatio ?? PR_BASELINE;
  const subjectKwhPerKw = sidoBaseline * (pr / PR_BASELINE);
  const subjectAnnualGen = input.capacityKw * subjectKwhPerKw;

  const peerAnnualGen = peers.map(
    (p) => p.capacityKw * p.annualKwhPerKw * (p.performanceRatio / PR_BASELINE),
  );
  const peerKwhPerKw = peers.map(
    (p) => p.annualKwhPerKw * (p.performanceRatio / PR_BASELINE),
  );

  const sortedAnnual = [...peerAnnualGen].sort((a, b) => a - b);
  const sortedPerKw = [...peerKwhPerKw].sort((a, b) => a - b);

  return {
    plantId: input.id,
    estimatedAnnualGen: subjectAnnualGen,
    genPerKw: subjectKwhPerKw,
    genPercentile: percentileOf(sortedAnnual, subjectAnnualGen),
    efficiencyPercentile: percentileOf(sortedPerKw, subjectKwhPerKw),
    peerCount: peers.length,
    stratification: { sido, siteType: input.siteType, capacityBand: band, level },
    peerStats: {
      meanKwhPerYear: mean(peerAnnualGen),
      stdDevKwhPerYear: stdDev(peerAnnualGen),
      meanKwhPerKw: mean(peerKwhPerKw),
      stdDevKwhPerKw: stdDev(peerKwhPerKw),
    },
  };
}
