# scripts/

`/lib/data/` 정적 JSON을 갱신하기 위한 데이터 수집/빌드 스크립트.

## 데이터 갱신 정책

- **자동화 가능**: 스크립트로 fetch + transform
- **수동 정리**: 공개 자료(공고문, 보고서, 언론)에서 정리 후 정적 JSON 작성

각 데이터 파일 헤더 (`_meta`)에 출처/수집일/신뢰도/노트를 명시.

---

## 수집 가이드 (per data file)

### `smp.json` — KPX 월간 SMP
- 출처: https://epsis.kpx.or.kr (전력시장 통계 시스템)
- 자동화 난이도: **HIGH** (공식 REST API 비공개, 웹 GET + 파싱 필요)
- v1 시드: 공개 월평균치 기반
- 갱신 절차:
  1. epsis.kpx.or.kr → 일별 SMP 조회 → 월간 CSV 다운로드 (육지/제주 분리)
  2. CSV → `monthly: [{ ym, value }]` 형식으로 변환
  3. `_meta.fetchedAt`, `_meta.notes` 갱신

### `rec.json` — 한국에너지공단 REC 거래
- 출처: https://onerec.kmos.kr (RPS 거래 시스템, 일부 비공개)
- 자동화 난이도: **HIGH**
- v1 시드: 공개 월평균치 기반
- 갱신 절차: 시스템 다운로드 → 월간 평균 → 변환

### `weights.json` — REC 가중치 표
- 출처: 산업통상자원부 신·재생에너지 공급의무화제도 관리·운영지침 고시
- 자동화 난이도: **LOW** (정책 변경 시에만 갱신, 연 1회 수준)
- 갱신 절차: 최신 고시 확인 → 표 직접 수정

### `auctionResults.json` — 고정가격경쟁입찰 결과
- 출처: 한국에너지공단 RPS 입찰 결과공고
- 자동화 난이도: **MEDIUM** (라운드별 PDF 공고)
- 분기별 평균 낙찰가, 용량 구간별
- v1 시드: smpBaseValue=80원/kWh 일관 추정 분해 (`smpBaseSource: 'estimated'`)
- 갱신 절차: 신규 라운드 결과공고 → 평균 낙찰가 추가 → 분해값(공고 명시 시) 또는 추정 분해

### `substations.geojson` (실제 파일명: `substations.json`)
- 출처: 공공데이터포털 (한전 송변전 GeoJSON)
- 자동화 난이도: **LOW** (data.go.kr API 가능)
- v1 시드: 주요 154/345/765kV 변전소 12개
- 갱신 절차: data.go.kr 다운로드 → properties 표준화 → JSON 저장

### `curtailment.json` — 출력제어 통계
- 출처: 산업통상자원부 + 언론 보도 + 한전 출력제어 알림
- 자동화 난이도: **HIGH** (공식 통합 통계 부재)
- v1 시드: 권역별 추정 (제주, 호남, 영남, 중부, default)
- 갱신 절차: 분기별 산업부 자료 + 언론 종합 → 권역별 합산

### `regionDefaults.json` — 시도/시군구 일사량
- 출처: 기상청 ASOS 30년 평균 (https://data.kma.go.kr)
- 자동화 난이도: **MEDIUM** (CSV 다운로드 가능)
- v1 시드: 시도 평균
- 갱신 절차: 30년 평균 변경 시 (10년에 1회) → 시도/시군구 평균 재계산

---

## 향후 작성 예정 스크립트

| 파일 | 책임 | v1 상태 |
|---|---|---|
| `fetch-kpx.ts` | KPX SMP 월간 데이터 자동 수집 | TODO (수동 시드) |
| `fetch-rec.ts` | RPS REC 거래결과 수집 | TODO (수동 시드) |
| `fetch-substations.ts` | 한전 변전소 GeoJSON | TODO (data.go.kr API) |
| `fetch-asos.ts` | 기상청 ASOS 일사량 | TODO (data.kma API) |
| `build-data.ts` | 모든 JSON 검증 + `lib/data/index.ts` 자동 빌드 | TODO |

---

## 한계 명시

v1 데이터 신뢰도:
- High: weights, auctionResults (공개 공고 기반)
- Medium: smp, rec, regionDefaults
- Low: substations (시드 12개), curtailment (공식 통계 부재)

UI에서는 confidence 레벨에 따라 신뢰도 배지 (Low인 경우 "추정" 표시)로 사용자에게 명확히 알린다.
