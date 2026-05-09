# Roadmap

본 문서는 v1 범위 밖이지만 후속 버전에서 다룰 작업을 기록한다.
v1 = 현재 진행 중인 Phase 0~6 단일 사이클로 도달하는 첫 release.

---

## v0.1.0 마일스톤 (완료)

- ✅ Phase 0~4 (types · data · location · simulator · benchmark · portfolio · UI · PDF · 배포)
- ✅ Vercel 한국 리전(icn1) 배포
- ✅ 카카오 REST API 실호출 (서버 프록시 + 자동 mock fallback)
- ✅ VWorld address API 실호출 (level5에서 토지 종류 자동 추출)
- ✅ PVGIS PVcalc 실호출 (좌표별 실제 일사량)
- ✅ 주소 텍스트 검색 모드 (위저드 step-2 + test-location)
- ✅ PDF 한글 폰트 self-host

---

## v2 일관성 작업 후보 — 출처 구분 필드 확장

v1에서는 시나리오 B만 `smpBaseSource: 'official' | 'estimated'`로 분해 출처를 구분한다.
v2에서는 모든 시나리오에 동등한 출처 구분 필드를 추가하여 결과 카드의 "신뢰도 배지" 렌더링을 일관화한다.

### 추가 후보 필드

| 시나리오 | 추가 필드 | 가능 값 | 의미 |
|---|---|---|---|
| C (2027 신규입찰, 추정) | `assumedUnitPriceSource` | `'user-input'` \| `'default-estimate'` | 사용자가 슬라이더로 직접 입력했는지 vs 디폴트 추정값을 그대로 썼는지 |
| D (직접 PPA) | `transmissionFeeSource` | `'kepco-tariff'` \| `'estimate'` | 한전 약관 명시값인지 vs 평균 추정값인지 |

### 영향 범위
- `lib/types/ScenarioResult.ts` — `AppliedAssumptionsC`, `AppliedAssumptionsD`에 필드 추가
- `lib/simulator/` — 시뮬레이션 시 출처 결정 로직 추가
- `components/result/` — 신뢰도 배지 일관 렌더링
- `docs/scenarios.md`, `docs/assumptions.md` — 표/스키마 동기화

### 채택 시점
- 기본 v2 (시뮬레이터 안정화 + 사용자 피드백 이후)
- 단, v1 출시 전 디자인 QA에서 일관성 이슈가 명확히 드러나면 v1.x patch에서 선반영 허용

---

## 데이터 소스 추가 후보

- **GK-2A 위성 일사량** — `IrradianceSource`에 `'gk2a-satellite'` 추가, PlantLocation 보정에 활용
- **한국에너지공단 발전량 통계 API** — 벤치마킹 모듈 강화 (현재는 정적 통계 기반)
- **KEPCO 출력제어 실시간 데이터** — 권역별 통계 → 실측 반영
- **공공 PV 발전량 표본 (사이트별)** — 동급 비교군 풀 확장
- **SMP-zero 시간대별 시드** — KPX 시간별 SMP 통계 분석으로 cannibalization 발생 시간을 별도 시드. 현재 `lib/portfolio/exposure.ts`는 curtailment.json avgRate를 proxy로 사용 중 (구조적 원인은 같으나 발생 시간이 정확히 일치하지 않음).
- ~~**PDF 한글 폰트 self-host**~~ — ✅ **완료** (v0.1.0). Noto Sans KR Regular/Bold `.ttf`를 `/public/fonts/`에 self-host. PDF 모든 한글 필드(plant name, address, region, recommendations)가 native 렌더링됨. `asciiSafe()` placeholder 제거. CDN 의존성 0.
- **PR 별 발전량 비교 차트** — PR 0.80 / 0.85 / 0.88 시나리오를 결과 페이지에서 토글 비교 (Phase 4-D 후보).

---

## 기능 후보

- **Multi-plant 위저드 UI** — `userType: 'multi'`로 선택했을 때 step-3에서 "발전소 추가" 버튼으로 여러 개를 연속 입력. 현재 v1은 단일 발전소만 입력 가능 (포트폴리오 분석 모듈 자체는 다수 발전소를 지원하지만 UI 미완). v1.x 우선 구현 항목.
- **다중 사용자/팀 워크스페이스** — 현재는 단일 클라이언트 zustand
- **시나리오 비교 시 Monte Carlo 분포** — 현재는 ±30% 단순 변동성 (A 한정)
- **PDF 리포트 다국어 (ko/en) 토글**
- **발전량 실측 입력 → 가정값 캘리브레이션** — 사용자가 과거 실적을 입력하면 PR/열화율 자동 보정
- **출력제어 회피 입찰 가이드** — 권역 분산 매수 추천

---

## 운영/엔지니어링 후보

- **`/lib/data/` 자동 갱신 cron** — 현재는 수동 빌드, 분기 자동화
- **시나리오 매출 공식 단위 테스트 강화** — 4개 시나리오 × 경계 케이스
- **결과 결정성 보장** — 같은 입력 → 같은 결과 (캐시 키 정의)

---

## 우선순위 메모

- v2 직행 후보: 출처 구분 일관화 (위 §1) + Monte Carlo 분포
- v1.x 패치 가능: 데이터 소스 갱신 자동화
- 장기 백로그: 다국어 PDF, 다중 사용자
