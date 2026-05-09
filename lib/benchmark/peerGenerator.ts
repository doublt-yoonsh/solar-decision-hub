// /lib/benchmark/peerGenerator.ts
// Generate a deterministic synthetic peer pool for benchmarking.
// Same seed → same pool. Used by /lib/benchmark/index.ts.

import { mulberry32 } from "../shared/montecarlo";
import { regionDefaults } from "../data";
import type { SiteType, CapacityBand } from "../types/PlantInput";

export interface VirtualPeer {
  id: string;
  capacityKw: number;
  siteType: SiteType;
  sido: string;
  /** Per-peer perturbed annual generation per kW (kWh/kWp/year). */
  annualKwhPerKw: number;
  /** Per-peer perturbed performance ratio (0.75 ~ 0.85). */
  performanceRatio: number;
}

const SIDO_LIST: ReadonlyArray<string> = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원도",
  "충청북도",
  "충청남도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

const SITE_TYPES: ReadonlyArray<SiteType> = [
  "general",
  "building",
  "forest",
  "water",
];

const CAPACITY_BUCKETS: ReadonlyArray<number> = [99, 250, 500, 1000, 3000];

export interface PeerFilter {
  sido?: string;
  siteType?: SiteType;
  capacityBand?: CapacityBand;
}

function matchesCapacityBand(capacityKw: number, band: CapacityBand): boolean {
  if (band === "lt100kw") return capacityKw < 100;
  if (band === "lt3mw") return capacityKw >= 100 && capacityKw < 3000;
  return capacityKw >= 3000;
}

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/**
 * Generate `count` peers using `seed`. Optional `filter` slices the pool.
 * The seed-controlled pool is generated once then filtered, so callers can
 * compare different filter subsets while preserving reproducibility.
 */
export function generatePeers(
  count: number,
  seed: number,
  filter?: PeerFilter,
): VirtualPeer[] {
  const rng = mulberry32(seed);
  const peers: VirtualPeer[] = [];

  for (let i = 0; i < count; i++) {
    const sido = pick(SIDO_LIST, rng);
    const siteType = pick(SITE_TYPES, rng);
    const capacityKw = pick(CAPACITY_BUCKETS, rng);

    const baseline =
      (
        regionDefaults.bySido as Record<
          string,
          { annualKwhPerKw: number } | undefined
        >
      )[sido]?.annualKwhPerKw ?? regionDefaults.default.annualKwhPerKw;

    // Perturbations: ±10% on annualKwhPerKw, PR uniform on [0.75, 0.85].
    const annualKwhPerKw = baseline * (0.9 + rng() * 0.2);
    const performanceRatio = 0.75 + rng() * 0.1;

    peers.push({
      id: `peer-${i}`,
      capacityKw,
      siteType,
      sido,
      annualKwhPerKw,
      performanceRatio,
    });
  }

  if (!filter) return peers;
  return peers.filter(
    (p) =>
      (!filter.sido || p.sido === filter.sido) &&
      (!filter.siteType || p.siteType === filter.siteType) &&
      (!filter.capacityBand ||
        matchesCapacityBand(p.capacityKw, filter.capacityBand)),
  );
}
