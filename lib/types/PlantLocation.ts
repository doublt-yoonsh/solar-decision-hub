// PlantLocation.ts
// Location enriched from address through Kakao / PVGIS / VWorld APIs.
// Enrichment is performed once in /lib/location/ and cached on the input.

/** Korea's two physically separate grids. */
export type GridSystem = 'main' | 'jeju';

/** How the solar irradiance value was obtained. */
export type IrradianceSource =
  | 'pvgis'           // PVGIS API result
  | 'asos-fallback'   // KMA ASOS station 30y mean (nearest station)
  | 'manual-import'   // user-imported CSV / monthly grid (e.g. past actuals)
  | 'user-estimate';  // single user-entered estimate

export interface PlantLocation {
  /** Original user-entered address (도로명 또는 지번). */
  address: string;

  /** Latitude (WGS84). */
  lat: number;

  /** Longitude (WGS84). */
  lng: number;

  /** Land-use category from VWorld (지목): 전, 답, 임야, 대지, 잡종지, etc. */
  landUse?: string;

  /** Administrative region used for benchmarking and curtailment lookups. */
  region: {
    sido: string;          // 시도 (예: 경상북도)
    sigungu: string;       // 시군구 (예: 영주시)
    eupmyeondong?: string; // 읍면동 (선택)
  };

  /** Closest substation (used for curtailment context). */
  nearestSubstation?: {
    name: string;
    distanceKm: number;
    grid: GridSystem;
  };

  /** Solar irradiance — from PVGIS, falls back to ASOS 30y mean. */
  solarIrradiance?: {
    /** Annual kWh produced per kW installed (kWh/kWp/yr). */
    annualKwhPerKw: number;
    /** Daily peak sun hours (h/day). */
    peakSunHours: number;
    /** PVGIS-derived Performance Ratio (E_y / H(i)_y) for this coordinate. */
    derivedPR?: number;
    /** Where the value came from. */
    source: IrradianceSource;
  };
}
