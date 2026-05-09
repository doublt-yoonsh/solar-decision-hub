// /lib/location/siteTypeHeuristic.ts
// Heuristic site-type inference from Korean address text.
// v1 stand-in for VWorld API (which is excluded from v1 per project decision).
// Tested in `siteTypeHeuristic.test.ts`; HEURISTIC_TEST_CASES is the source of
// truth for what each rule must match.

import type { SiteType } from "../types/PlantInput";
import type { SiteTypeHint } from "./types";

/** Apply heuristic rules in priority order; first match wins. */
export function inferSiteType(addressText: string): SiteTypeHint {
  const text = addressText.trim();

  // Rule 1 — '산' as a 지번 prefix (mountain land code) → forest
  // Korean cadastral notation: "산 12-3" or "산림" both indicate mountain/forest.
  if (/(^|[\s,])산\s?\d/.test(text) || text.includes("산림")) {
    return mkHint("forest", "medium", "지번에 '산' 포함 → 임야로 추정");
  }

  // Rule 2 — water bodies in the address
  if (/(저수지|댐|호수)/.test(text)) {
    return mkHint("water", "low", "저수지/댐/호수 키워드 → 수상으로 추정");
  }

  // Rule 3 — road-name + building-keyword pattern → building (rooftop)
  const hasRoadName = /(로|길|대로)\s*\d+/.test(text);
  const hasBuildingKeyword =
    /(빌딩|타워|아파트|상가|센터|회관|학교|병원|공장|창고|단지|오피스|교회|성당)/.test(
      text,
    );
  if (hasRoadName && hasBuildingKeyword) {
    return mkHint(
      "building",
      "medium",
      "도로명 + 건물명 패턴 → 건축물 옥상으로 추정",
    );
  }

  // Rule 4 — agricultural lots (전/답) anywhere in the text → general farmland
  if (/(\s|^)(전|답)(\s|$)/.test(text)) {
    return mkHint(
      "general",
      "medium",
      "지번에 '전/답' 포함 → 농지(일반부지)로 추정",
    );
  }

  // Rule 5 — default
  return mkHint(
    "general",
    "low",
    "특정 패턴 미매치 → 일반부지 디폴트",
  );
}

function mkHint(
  inferred: SiteType,
  confidence: SiteTypeHint["confidence"],
  reason: string,
): SiteTypeHint {
  return {
    inferred,
    confidence,
    reason,
    sourceMeta: {
      source: "fallback",
      confidence,
      notes: "v1 address heuristic (VWorld 대체)",
    },
  };
}

/**
 * Source-of-truth test cases. Asserted in siteTypeHeuristic.test.ts.
 * Edit here when adjusting rules; keep tests in sync.
 */
export const HEURISTIC_TEST_CASES: ReadonlyArray<{
  input: string;
  expected: SiteType;
  ruleHint: string;
}> = [
  {
    input: "경상북도 경주시 산내면 의곡리 산 12-3",
    expected: "forest",
    ruleHint: "산 + 지번",
  },
  {
    input: "서울특별시 강남구 테헤란로 123 강남빌딩",
    expected: "building",
    ruleHint: "도로명 + 빌딩",
  },
  {
    input: "충청남도 당진시 송산면 송산저수지 인근",
    expected: "water",
    ruleHint: "저수지",
  },
  {
    input: "경기도 평택시 청북면 어연리 12-3 답",
    expected: "general",
    ruleHint: "답 농지",
  },
  {
    input: "전라남도 영광군 백수읍 백수해안로 1",
    expected: "general",
    ruleHint: "디폴트(농지/일반)",
  },
];
