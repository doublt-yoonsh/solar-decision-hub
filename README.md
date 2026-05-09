# Solar Decision Hub

> **RPS 폐지 시대, 내 발전소는 어디로 가야 할까?**

태양광 발전사업자가 RPS 폐지(2027)를 앞두고 4가지 시장 전환 시나리오를 데이터로 비교할 수 있도록 만든 통합 의사결정 대시보드. 한 번의 좌표 입력으로 **벤치마킹 + 시나리오 시뮬레이션 + 포트폴리오 리스크**를 동시에 진단합니다.

데모: <https://solar-decision-hub.vercel.app> *(배포 후 갱신)*

---

## 핵심 기능

| 모듈 | 무엇을 답하는가 |
|---|---|
| **진단 (벤치마킹)** | 내 발전소가 동급 1,000개 가상 비교군 대비 효율 몇 백분위인가? |
| **시나리오 시뮬레이션** | 현물 / 고정가격 / 2027 신규입찰 / 직접 PPA 4개 중 어느 길이 NPV·IRR 기준 최적인가? |
| **포트폴리오 리스크** | 다수 발전소 보유 시 지역·부지·계통 집중도(HHI), 정책 리스크, 출력제어 노출은? |

세 분석을 한 화면에 통합 — 단일 발전소 입력에서 **결과까지 5초**.

## 비즈니스 가치

이 도구는 단독 SaaS가 아니라 **다수 발전소 운영 데이터를 가진 플랫폼에 모듈로 결합될 때** 진짜 가치를 가집니다. 발전소 데이터(좌표·용량·부지·운영실적)를 이미 보유한 EPC, RE100 중개 플랫폼, ESS/PV 통합관리 SaaS는 이 모듈을 임베드하여 사용자에게 즉시 의사결정 인사이트를 제공할 수 있습니다.

또한 RPS 폐지가 임박한 한국 PV 시장에서 **공개 정보 기반의 신뢰할 수 있는 추정 도구**가 부재한 상황 — 그 공백을 메우는 무료/오픈 도구로도 의미가 있습니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router) + TypeScript (strict + `noUncheckedIndexedAccess`)
- **UI**: Tailwind v3 + shadcn/ui (default style, neutral)
- **차트**: Recharts (동적 import로 분리)
- **상태**: Zustand + persist (localStorage 자동 복원)
- **PDF**: @react-pdf/renderer (현재 영문 전용 — v1.x에서 한글 폰트 self-host)
- **테스트**: vitest (111 tests, 시드 고정 재현성)
- **데이터**: 정적 JSON (외부 API 의존성 0)
- **배포**: Vercel (icn1 region, ESM externals 처리)

## 디렉토리 구조

```
app/                        Next.js App Router
  page.tsx                  랜딩 (데모 + 위저드 진입)
  wizard/                   5단계 입력 위저드
  result/                   3 탭 결과 대시보드
  test-location/            mock 모드 좌표 인리치 테스트
  docs/                     가정 + 출처 + 한계
  icon.tsx, opengraph-image.tsx
  robots.ts, sitemap.ts
components/
  ui/                       shadcn 베이스 (button/card/input/slider/tabs)
  location/CoordinateInput  영토범위 검증 좌표 폼
  result/ScenarioCharts     Recharts 차트 (lazy)
  result/PDFSection         PDFDownloadLink (lazy + click-to-mount)
lib/
  types/                    PlantInput / PlantLocation / ScenarioResult / PortfolioMetrics
  data/                     7개 정적 JSON + dataMeta + getWeight + capacityBand
  shared/                   finance (NPV/IRR/payback) + montecarlo (mulberry32) + statistics
  simulator/                4 시나리오 + sensitivity tornado + 통합 simulate()
  benchmark/                seeded peer pool + percentile 분석
  portfolio/                HHI + diversity + policyRisk + exposure
  location/                 mock-first 인리치 (kakao/pvgis/siteTypeHeuristic/substation)
  pdf/Report.tsx            PDF 템플릿 (영문 v1)
  store/                    wizard.ts + demo.ts (Zustand persist)
docs/                       scenarios / architecture / data-sources / assumptions / roadmap
scripts/README.md           데이터 갱신 가이드
```

## 데이터 출처

| 데이터 | 출처 | 신뢰도 |
|---|---|---|
| SMP (월별 평균) | KPX 전력거래소 epsis.kpx.or.kr | medium |
| REC (월별 평균) | 한국에너지공단 RPS 시스템 | medium |
| REC 가중치 | 산업통상자원부 RPS 운영지침 | medium (검증 권장) |
| 입찰 결과 | 한국에너지공단 분기 공고 | medium (분해 추정) |
| 변전소 (12개 시드) | 공공데이터포털 한전 송변전 GeoJSON | low (12개만, v1.x 보강) |
| 출력제어 통계 | MOTIE + 언론 종합 | low (공식 통합 통계 부재) |
| 일사량 (시도 평균) | 기상청 ASOS 30년 평균 | medium |

## 한계 (솔직하게)

- **월별 평균 시드** — 일별 시계열은 v1.x 보강 예정
- **변전소 12개** — 50km 초과 시 권역 평균 폴백
- **smpBaseValue 80원/kWh 일관 추정** — 실제 분해는 v1.x
- **시나리오 C 정책 미확정** — 모든 수치 추정값
- **PDF 영문 전용 (v1)** — 한글 필드는 `[Korean]` placeholder. v1.x에서 Noto Sans KR self-host 후 한글 native 렌더링
- **다수 발전소 입력 UI는 v1.x** — 분석 모듈은 다수 지원, 위저드 UI만 단일 모드

추정값은 ±10% 오차 가능. 실제 사업 결정은 현장 조사 + 전문가 자문 필수.

## 로드맵

### v1.x
- 월별 → 일별 SMP/REC 시계열
- 변전소 600+ 풀 데이터
- PDF 한글 폰트 self-host
- Multi-plant 위저드 UI ("발전소 추가" 버튼)
- SMP-zero 시간대별 시드 (cannibalization 정확도)

### v2
- 모든 시나리오에 출처 구분 필드 (`assumedUnitPriceSource`, `transmissionFeeSource`)
- Monte Carlo 분포 시각화 (현재 ±30% 단순 변동성)
- GK-2A 위성 일사량 통합
- 실측 발전량 입력 → PR/열화율 자동 캘리브레이션
- PDF 다국어 토글, 다중 사용자 워크스페이스

상세 항목은 `docs/roadmap.md` 참조.

## 로컬 실행

```bash
git clone <repo>
cd SolarDecisionHub
npm install
npm run dev
```

`http://localhost:3000` 에서 **mock 모드로 즉시 동작**. `.env.local` 없이도 모든 기능 사용 가능 (좌표 인리치는 5개 fixture로 매핑).

### 실제 모드 전환

`.env.local` 생성 후:
```
NEXT_PUBLIC_KAKAO_JS_KEY=...
KAKAO_REST_API_KEY=...
ENABLE_PVGIS_REAL=true
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

전체 환경변수는 [`.env.example`](./.env.example) 참고.

### 명령

```bash
npm run dev          # 개발 서버 (Turbopack 미사용, Next 14 stable)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npm run test         # vitest (111 tests, 시드 고정)
npx tsc --noEmit     # 타입 체크
```

## Vercel 배포

이 저장소는 Vercel에 즉시 배포 가능합니다 — `vercel.json`이 `icn1` 한국 리전을 명시합니다.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### 배포 절차

1. Vercel Dashboard → New Project → 이 저장소 연결
2. Framework Preset: **Next.js** (자동 감지)
3. Environment Variables: `.env.example`의 키들을 입력
   - `NEXT_PUBLIC_SITE_URL`: 배포된 본인 도메인
   - 카카오 키는 발급 후 추가 (Phase 2B)
4. Deploy

### 카카오 도메인 등록

카카오 로컬 API를 활성화하려면 [Kakao Developers](https://developers.kakao.com)에서 Web 도메인을 등록해야 합니다 — Vercel 배포 도메인 (`*.vercel.app`)을 추가.

## 스크린샷

*(TODO: 배포 후 모바일/데스크톱 스크린샷 추가)*

- 랜딩 + 데모 카드
- 위저드 step-2 (위치 인리치 결과)
- 결과 대시보드 (시나리오 탭, NPV 비교)
- 포트폴리오 리스크 분해

## 라이센스

본 프로젝트는 *MIT License* (LICENSE 추가 필요).
공개 데이터 라이센스는 [`docs/data-sources.md`](./docs/data-sources.md) 참고.

## 기여

이슈 / PR 환영. 도메인 정확도 향상 (특히 변전소 풀 데이터, 출력제어 시간대별 통계)에 기여 가능.
