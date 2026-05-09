# Data Sources

## Static JSON Files (`/lib/data/`)

| File | Source | Coverage | Cadence | License | Status |
|------|--------|---------|---------|---------|--------|
| `smp.json` | KPX 전력거래소 일별 SMP 공시 | 2021-01 ~ 2025-12, 육지/제주 분리 | yearly manual | 공공데이터 | TODO |
| `rec.json` | 한국에너지공단 RPS 시스템 거래 결과 | 2021-01 ~ 2025-12 | yearly manual | 공공데이터 | TODO |
| `weights.json` | 산업통상자원부 RPS 운영지침 고시 | 부지×용량 구간 | on policy change | 공공데이터 | TODO (verify) |
| `auctionResults.json` | 한국에너지공단 고정가격경쟁입찰 결과공고 | 2017 ~ 최근, 용량/연도별 평균 | per-round | 공공데이터 | TODO |
| `substations.geojson` | 공공데이터포털 - 한전 송변전 GeoJSON | 전국 | yearly | 공공데이터 | TODO |
| `curtailment.json` | 산업부 자료 + 언론 보도 종합 | 권역별/연도별 발생 횟수 | yearly | mixed (cite) | TODO |
| `regionDefaults.json` | 기상청 ASOS 30년 평균 일사량 | 시도/시군구 단위 | rare | 공공데이터 | TODO |

## Required Header (every file)

```json
{
  "_meta": {
    "source": "URL or document name",
    "fetchedAt": "YYYY-MM-DD",
    "license": "공공데이터 / CC BY 등",
    "notes": "추정 / 변환 / 보정 내용 명시"
  },
  ...
}
```

## Runtime APIs (with mandatory fallback)

| API | Purpose | Endpoint hint | Fallback |
|---|---|---|---|
| 카카오 로컬 API | 주소 → 좌표 + 행정구역 | dapi.kakao.com/v2/local | regionDefaults centroid |
| PVGIS (EU JRC) | 좌표 → 일사량 / 발전량 추정 | re.jrc.ec.europa.eu/api/v5_2 | ASOS 시군구 30년 평균 |
| VWorld API | 좌표 → 지목 | api.vworld.kr | 사용자 직접 입력 |

## Collection Plan (Phase 1)
- 7개 정적 JSON 파일을 `/scripts/fetch-{source}.ts`로 수집.
- 비공개/접근 어려운 항목은 공개 자료에서 정리한 정적 JSON 사용 + `_meta.source`에 출처 명시.
- 모든 추정/변환 작업은 `_meta.notes`에 한 줄로 기록.
- 수집 후 `npm run build:data`로 `/lib/data/index.ts` 생성.

## Confidence Levels
- High: 출처 공시 데이터 그대로 (smp, rec, auctionResults, substations).
- Medium: 공시 + 추정 보정 (weights — 분류 단순화, regionDefaults — 시군구 평균).
- Low: 종합 추정 (curtailment — 일부 언론 보도 합산, 공식 통계 미존재 시).
- 결과 화면에서 Low 데이터에는 "추정" 배지 표시.

## License & Attribution
- 모든 공공데이터는 출처 표기 후 사용.
- 가공/보정한 경우 가공 내용 명시.
- 본 프로젝트 자체는 [License TBD] — 데이터 라이센스와는 별개.
