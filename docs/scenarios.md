# 4개 시나리오 매출 공식

본 문서는 Solar Decision Hub의 시나리오 시뮬레이션 모듈이 사용하는 매출 산정 공식을 정의한다.
모든 공식은 `/lib/simulator/`에서 구현되며, 사용자는 모든 입력값과 가정을 위저드와 슬라이더로 오버라이드할 수 있다.

---

## 0. 공통: 발전량 산정

모든 시나리오의 매출은 연간 발전량을 기반으로 한다.

```
연간 발전량 (kWh/year) = 설치용량 (kW)
                        × 평균 일사시간 (peak sun hours/day)
                        × 365
                        × Performance Ratio (PR)
                        × (1 - 출력제어율)
```

| 변수 | 단위 | 출처 / 디폴트 |
|------|------|---------------|
| 설치용량 | kW | 사용자 입력 (필수) |
| 평균 일사시간 | h/day | PVGIS API (좌표 기반) → 폴백: 시군구 30년 평균 |
| Performance Ratio | 0~1 | 디폴트 0.80 (모듈 열화·인버터 손실·전선 손실 종합), 사용자 조정 가능 |
| 출력제어율 | 0~1 | 권역별 통계 (curtailment.json), 디폴트 적용 |

**열화율 적용 (장기 시뮬레이션 시)**
- t년차 발전량 = 1년차 발전량 × (1 - 0.005)^(t-1)
- 디폴트 연간 열화율 0.5% (사용자 조정 가능)

---

## 0-1. REC 가중치 표 (부지 × 용량 구간)

가중치는 부지 종류와 발전소 용량 구간에 따라 결정된다. 시나리오 A·B에서 공통으로 참조한다.
실제 데이터는 `/lib/data/weights.json`에 저장되며, 최신 산업통상자원부 고시
**(신·재생에너지 공급의무화제도 관리·운영지침)** 확인 후 검증 적용한다.

| 부지 (siteType) | < 100kW | 100kW ~ 3MW | ≥ 3MW |
|---|---|---|---|
| general (일반부지) | 1.2 | 1.0 | 0.7 |
| building (건축물 옥상 등) | 1.4 | 1.2 | 1.0 |
| forest (임야) | 0.5 | 0.5 | 0.5 |
| water (수상) | 1.6 | 1.4 | 1.4 |

> 위 표는 통상 알려진 값이며 최신 고시 확인 후 갱신 필수.

**가중치 선택 함수 시그니처**
```ts
// /lib/data/weights.ts
export type SiteType = 'general' | 'building' | 'forest' | 'water';
export function getWeight(siteType: SiteType, capacityKw: number): number;
//   capacityKw < 100         → lt100kw
//   100 <= capacityKw < 3000 → lt3mw
//   capacityKw >= 3000       → gte3mw
```

**weights.json 스키마**
```json
{
  "lastUpdated": "YYYY-MM-DD",
  "source": "산업통상자원부 고시 제YYYY-NNNN호 (확인 필요)",
  "weights": {
    "general":  { "lt100kw": 1.2, "lt3mw": 1.0, "gte3mw": 0.7 },
    "building": { "lt100kw": 1.4, "lt3mw": 1.2, "gte3mw": 1.0 },
    "forest":   { "lt100kw": 0.5, "lt3mw": 0.5, "gte3mw": 0.5 },
    "water":    { "lt100kw": 1.6, "lt3mw": 1.4, "gte3mw": 1.4 }
  }
}
```

---

## A. 현물시장 (Spot Market)

> "지금 그대로 SMP+REC 현물에 의존해서 운영"

### 매출 공식

```
연 매출_A = SMP수익 + REC수익

SMP수익 = 발전량(kWh) × SMP(원/kWh)
REC수익 = (발전량(kWh) / 1000) × 가중치 × REC현물가(원/REC)
```

### 핵심 가정
- **SMP**: 최근 12개월 평균을 디폴트, 사용자가 시계열 슬라이더로 조정 가능
- **REC 현물가**: 최근 12개월 평균
- **가중치**: `getWeight(siteType, capacityKw)` — 부지 × 용량 구간별 매핑 (§0-1 참조). 사용자 오버라이드 가능
- **2027년 이후**: REC 신규 발급 중단(2026년 말 종료) 가정 → 2027년부터 REC수익 = 0
  - 단, 기존 발급분은 유효기간(3년)까지 매도 가능 → 보유분 처분 시점 사용자 입력

### 변동성 / 리스크
- SMP 변동성: ±30% 시나리오 자동 생성 (낙관/기준/보수)
- 카니발라이제이션 위험: 재생E 비중 증가 시 SMP 0원 시간 증가 → 권역별 보정계수
- 출력제어: 권역 통계 반영 (curtailment.json)

---

## B. 고정가격계약 (20년 장기계약, FIT-style)

> "한국에너지공단 고정가격경쟁입찰로 20년 묶기"

### 매출 공식

> **공시 입찰 평균 낙찰가는 가중치 1.0 기준 표준값**이다. 사용자 발전소 가중치가 다르면 보정해야 한다.

```
연 매출_B = 발전량(kWh) × [SMP기준값(원/kWh) + REC가치(원/kWh) × (사용자가중치 / 1.0)]

  · SMP기준값  : 낙찰가에서 SMP에 귀속되는 부분 (입찰 공고 또는 추정)
  · REC가치    : 낙찰가에서 REC에 귀속되는 부분 (가중치 1.0 기준)
  · 사용자가중치: getWeight(siteType, capacityKw) (§0-1)
```

### 핵심 가정
- **낙찰가 분해 저장**: `auctionResults.json`은 낙찰가를 `{ smpBaseValue, recValue }` 두 필드로 분해 저장
  - 공고문에 분해값이 명시된 경우 그대로 사용
  - 미명시 시 추정: `smpBaseValue = 80원/kWh` (최근 SMP 평균 참고), `recValue = 낙찰가 - 80원/kWh`
  - 추정 사용 여부는 결과 카드에 "추정 분해" 배지로 표시 (`smpBaseSource: 'estimated'`)
- **낙찰가 디폴트**: 최근 입찰결과 평균 약 145~165원/kWh (용량/연도별)
- **계약기간**: 20년 고정
- **인플레이션 미반영**: 명목금액 고정 (실질 가치 감소 → 한계 페이지에 명시)
- **출력제어 정산**: 미정산 가정 (실손)
- **신규 입찰 가능 여부**: 2026년 입찰 종료 가능성 → 사용자 경고

**auctionResults.json 스키마**
```json
{
  "lastUpdated": "YYYY-MM-DD",
  "source": "한국에너지공단 RPS 고정가격경쟁입찰 결과 공고",
  "results": [
    {
      "year": 2025,
      "round": 1,
      "capacityBand": "lt100kw",
      "winningPrice": 158.2,
      "smpBaseValue": 80.0,
      "recValue": 78.2,
      "smpBaseSource": "estimated"
    }
  ]
}
```

### 변동성 / 리스크
- 정책 변경 위험: 낮음 (계약 발효 후)
- 진입 위험: 높음 (낙찰 자체가 경쟁)

---

## C. 2027 계약시장 (RPS 폐지 후 신규 제도, 추정)

> "RPS 폐지 후 정부가 새로 도입할 입찰 시장에 참여"

### 매출 공식

```
연 매출_C = 발전량(kWh) × 신규입찰단가(원/kWh)
```

### 핵심 가정 (모두 추정)
- **신규입찰단가**: 디폴트 130원/kWh (해외 CfD/CME 사례 참고), 사용자 슬라이더로 100~200원/kWh 조정
- **계약기간**: 디폴트 **20년** (현행 RPS 고정가격계약 표준 + 업계 추정), 슬라이더로 **15~25년** 조정
- **시작연도**: 2027년 가정
- **인플레 연동**: 옵션 (디폴트 미연동)

### 변동성 / 리스크
- **정책 미확정**: 모든 수치는 추정. 결과 카드에 "추정" 배지 필수
- 입찰 통과율, 가격 형성 메커니즘 모두 미확정

---

## D. 직접 PPA (Corporate PPA)

> "RE100 기업과 직접 전력판매계약"

### 매출 공식

```
연 매출_D = 발전량(kWh) × [PPA단가 + RE100프리미엄 − 한전 송배전 이용료]   (모두 원/kWh)
            ↳ AppliedAssumptionsD: ppaUnitPrice, re100Premium?, transmissionFee
```

### 핵심 가정
- **PPA단가**: 디폴트 160원/kWh (사용자 협상력에 따라 130~200 범위 슬라이더)
- **한전 송배전 이용료(망 사용료)**:
  - 디폴트 12원/kWh
  - 출처: 한전 송배전 사용료 약관 기준 추정 (전압별·계약종별 차등 → 평균 추정값)
  - 슬라이더로 5~20원/kWh 조정 가능 (지역·전압급별 차이 반영)
- **계약기간**: 디폴트 10년 (5~20년 조정)
- **REC 별도 거래**: 디폴트 미포함 (PPA 단가에 흡수 가정), 옵션으로 분리 거래 토글

### 변동성 / 리스크
- 협상 의존도가 가장 큼
- RE100 시장 수요 불확실성
- 한전 송배전 이용료 정책 변경 위험

---

## 비교 산출물

각 시나리오별로 다음 지표를 계산하여 결과 대시보드에 표시한다.
구현은 `/lib/shared/finance.ts` (NPV, IRR 유틸).

| 지표 | 단위 | 비고 |
|------|------|------|
| 연간 매출 (1년차) | 원 | 위 공식 |
| 누적 매출 (계약기간) | 원 | 열화 + 인플레 반영 |
| NPV (할인율 5% 디폴트) | 원 | 사용자 조정 가능 |
| IRR | % | 초기 CAPEX 입력 시에만 |
| 단위 매출 (kWh당) | 원/kWh | 평준화 비교 |
| 변동성 폭 (낙관-기준-보수) | 원 | A 시나리오 한정 |

---

## 모듈 인터페이스 (구현 가이드)

```ts
// /lib/simulator/types.ts
export interface ScenarioInput {
  plant: PlantInput;            // 발전소 기본 정보
  yearlyGen: number;            // 연간 발전량 (kWh)
  assumptions: Assumptions;     // 사용자 조정 가정
}

export interface ScenarioResult {
  scenario: 'A' | 'B' | 'C' | 'D';
  yearlyRevenue: number[];      // 계약기간 연차별 매출
  npv: number;
  irr?: number;
  unitRevenue: number;          // 원/kWh
  riskRange?: { low: number; mid: number; high: number };
  warnings: string[];           // 사용자에게 보여줄 경고
}

export function simulateScenarioA(input: ScenarioInput): ScenarioResult;
export function simulateScenarioB(input: ScenarioInput): ScenarioResult;
export function simulateScenarioC(input: ScenarioInput): ScenarioResult;
export function simulateScenarioD(input: ScenarioInput): ScenarioResult;
```

---

## 한계 (필수 표기)

- 본 시뮬레이터는 **참고 도구**이며, 실제 사업성 판단은 전문가 검토 필수
- 시나리오 C는 **정책 미확정**으로 모든 수치가 추정
- 출력제어, 카니발라이제이션 등은 통계 기반 단순화 — 실제 발생 변동성 큼
- REC 가중치는 단순화된 표 사용. 실제 발급 가중치는 RPS 시스템 공시값 우선

---

**검토 요청 항목**
1. 4개 시나리오의 매출 공식 — 도메인적으로 정확한가?
2. 가중치 디폴트 (1.2 / 1.4 / 0.5 / 1.5) — 최신 RPS 가중치와 일치 여부?
3. 디폴트 PR (0.80), 열화율 (0.5%) — 업계 표준 범위인지?
4. 시나리오 D의 망사용료 12원/kWh — 합리적 가정인지?
5. NPV 디폴트 할인율 5% — 사업자 관점에서 적절한지?
