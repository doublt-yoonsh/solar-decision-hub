# Solar Decision Hub

## 프로젝트 정의
태양광 발전사업자를 위한 통합 의사결정 대시보드.
하나의 발전소 입력으로 3가지 분석을 동시에 제공한다:
1. 벤치마킹 — 동급 대비 성과 진단
2. 시나리오 시뮬레이션 — RPS 폐지 후 어떤 시장 전략이 유리한가
3. 포트폴리오 리스크 — 다수 보유 시 분산도/노출도 분석

## 도메인 핵심 용어
- SMP: 계통한계가격, 전력 도매가 (원/kWh)
- REC: 신재생에너지 공급인증서, 1MWh당 1개 발급
- 가중치: 부지별 REC 발급 배수 (일반부지 1.2, 건축물 1.4, 임야 0.5, 수상 1.5)
- RPS: 신재생에너지 공급의무화 제도 (2029년 폐지 예정)
- 출력제어: 계통 안정성 위해 발전 강제 중단
- 카니발라이제이션: 재생E 과잉 시 SMP 0원 발생 현상

## 시나리오 4개
- A. 현물시장: SMP + REC 현물가 (2026년 말까지만 신규 REC 발급)
- B. 고정가격계약: SMP기준값 + REC×가중치 20년 고정
- C. 2027 계약시장: 정부 입찰 단가 (추정값, 사용자 조정 가능)
- D. 직접PPA: 기업과 협상가 (디폴트 160원/kWh)

## 기술 스택
- Next.js 14 (App Router) + TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Recharts (차트)
- react-pdf (리포트)
- 카카오 로컬 API (주소 검색/지도)
- PVGIS API (일사량)
- VWorld API (지목 정보)
- 정적 JSON 데이터 (백엔드 X, 모놀리식)
- Vercel 배포

## 코딩 규칙
- 모든 분석 모듈은 독립적, /lib/{module}/ 구조
- 데이터 출처와 가정은 항상 코드 주석 + /docs/에 명시
- 디폴트값은 /lib/defaults/에서 중앙 관리
- 사용자 입력은 항상 오버라이드 가능 (자동 매핑 결과도)
- 모바일 우선 디자인 (max-width 기준이 아니라 min-width)
- 한국어 UI, 영어 코드 주석

## 디렉토리 구조
```
/app/
  page.tsx                      # 랜딩 (데모 + 시작 버튼)
  wizard/                       # 입력 위저드 5단계
  result/page.tsx               # 통합 결과 대시보드
  pdf/page.tsx                  # PDF 리포트
  docs/page.tsx                 # 가정·한계 페이지
/lib/
  types/                        # 공통 타입
  data/                         # 정적 JSON (SMP, REC, 가중치, 변전소 등)
  defaults/                     # 스마트 디폴트
  location/                     # 카카오/PVGIS/VWorld 래퍼
  benchmark/                    # 벤치마킹 모듈
  simulator/                    # 시나리오 시뮬레이터 모듈
  portfolio/                    # 포트폴리오 리스크 모듈
  shared/                       # NPV, IRR, 차트 유틸
/components/
  wizard/                       # 위저드 단계별
  result/                       # 결과 카드, 차트
  ui/                           # shadcn 베이스
/docs/
  architecture.md               # 모듈 의존성
  scenarios.md                  # 4개 시나리오 매출 공식
  data-sources.md               # 데이터 출처
  assumptions.md                # 가정 명시
  limitations.md                # 한계와 오차
/scripts/
  fetch-kpx.ts                  # KPX 데이터 수집
  build-data.ts                 # 정적 JSON 빌드
```

## 한계 명시 원칙
- 모든 추정값에는 오차 범위 표기
- 정책 변경 가능성 항상 경고
- 사용자가 가정을 조정할 수 있도록 슬라이더 제공

## 작업 진행 방식
- Phase별로 진행. 각 Phase는 문서 작성 → 코드 → 검토 순서
- 코드 작성 전 항상 타입 정의와 인터페이스 검토 받기
- 외부 API 호출은 항상 폴백 처리
- 모든 결정에 "왜" 주석 남기기

## Git 커밋 규칙 (워크스페이스 상속)
- Co-Authored-By 라인 절대 금지 (Claude, Happy 등 모두 포함하지 않음)
- 커밋 메시지는 변경 내용만 간결하게 작성
