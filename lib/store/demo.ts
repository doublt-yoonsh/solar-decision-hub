// /lib/store/demo.ts
// Demo presets shown on the landing page so first-time users can hit the
// dashboard in one click without filling out the wizard.

import type { PlantInput } from "../types/PlantInput";

export interface DemoPreset {
  id: string;
  label: string;
  description: string;
  plants: PlantInput[];
}

export const DEMO_PRESETS: ReadonlyArray<DemoPreset> = [
  {
    id: "small",
    label: "소규모 (99kW 영광)",
    description: "전남 영광군 일반부지 — 가장 흔한 소규모 사업자 구조",
    plants: [
      {
        id: "demo-yeonggwang",
        name: "영광 1호기",
        capacityKw: 99,
        siteType: "general",
        location: {
          address: "전라남도 영광군 백수읍 백수해안로 1",
          lat: 35.2773,
          lng: 126.4181,
          region: { sido: "전라남도", sigungu: "영광군" },
        },
        currentScenario: "A",
      },
    ],
  },
  {
    id: "medium",
    label: "중규모 (500kW 당진 건축물)",
    description: "충남 당진 — 건축물 옥상형 중규모, 가중치 1.2",
    plants: [
      {
        id: "demo-dangjin",
        name: "당진 1호기",
        capacityKw: 500,
        siteType: "building",
        location: {
          address: "충청남도 당진시 송산면 송산로 100",
          lat: 36.8893,
          lng: 126.6286,
          region: { sido: "충청남도", sigungu: "당진시" },
        },
        currentScenario: "B",
      },
    ],
  },
  {
    id: "large",
    label: "대규모 (3MW 경주)",
    description: "경북 경주 — 대규모 일반부지, 입찰시장 비교 검토",
    plants: [
      {
        id: "demo-gyeongju",
        name: "경주 1호기",
        capacityKw: 3000,
        siteType: "general",
        location: {
          address: "경상북도 경주시 산내면 의곡길 50",
          lat: 35.7858,
          lng: 129.2231,
          region: { sido: "경상북도", sigungu: "경주시" },
        },
        currentScenario: "B",
      },
    ],
  },
] as const;

export function getDemoById(id: string): DemoPreset | undefined {
  return DEMO_PRESETS.find((d) => d.id === id);
}
