# Assumptions

본 문서는 Solar Decision Hub가 사용하는 모든 가정값과 그 근거를 명시한다.
모든 가정은 `/lib/defaults/`에서 중앙 관리되며 사용자가 위저드/결과 슬라이더로 오버라이드할 수 있다.

## Generation (발전량 산정)

| Variable | Default | Source / Rationale | Override UI |
|---|---|---|---|
| Performance Ratio | **0.85** (한국 평균) | 한국 PV 실측 평균 (모듈 열화 + 인버터 + 전선 + 토양 손실 종합). 보수 0.80 / 낙관 0.88. regionDefaults annualKwhPerKw가 PR 0.85 baseline. | wizard slider 0.65 ~ 0.90 |
| Annual Degradation | 0.5%/year | 단결정 PV 표준 열화율 | wizard slider 0.3 ~ 1.0%/year |
| Curtailment Rate | region-based | `curtailment.json` 권역 통계 | wizard slider 0 ~ 30% |
| Peak Sun Hours | PVGIS 결과 | PVGIS API → 폴백: ASOS 30년 평균 | wizard input |

## Financial

| Variable | Default | Notes | Override UI |
|---|---|---|---|
| Discount Rate (NPV) | 5% | 사업자 자본비용 가정 (소형 PF 평균) | result slider 3 ~ 10% |
| Inflation | 0% (off) | 명목 매출 비교 단순화 | result toggle |
| CAPEX | 1,200,000원/kW | 2024 시장 평균 (선택 입력) | wizard input |
| OPEX | 25,000원/kW/year | 운영·보험·임차료 평균 | wizard slider |

## Scenario A — Spot Market

- SMP: `smp.json` 최근 12개월 평균
- REC 현물가: `rec.json` 최근 12개월 평균
- 2027년 이후 신규 REC 발급 = 0 (2026 말 종료 가정)
  - 기존 발급분은 유효기간 3년까지 매도 가능 → 사용자 입력
- ±30% 변동성 자동 시나리오 (낙관/기준/보수)
- 카니발라이제이션: 권역별 SMP 0원 발생 시간 보정 (curtailment 통계 기반)

## Scenario B — Fixed FIT (20-year)

- 낙찰가 분해 (`auctionResults.json`):
  - 공고 명시 시: `smpBaseValue` + `recValue` 그대로
  - 공고 미명시 시: `smpBaseValue = 80원/kWh` 추정, `recValue = winningPrice - 80`
  - 추정 사용 시 결과 카드에 "추정 분해" 배지 표시 (`smpBaseSource: 'estimated'`)
- 가중치 보정: `사용자가중치 / 1.0` (공시 낙찰가 = 가중치 1.0 기준)
- 계약기간: 20년 고정
- 인플레이션 미반영 (실질 가치 감소는 한계 페이지에 명시)
- 출력제어 정산: 미정산 가정 (실손)

## Scenario C — 2027 New Auction (ESTIMATED, 정책 미확정)

> 모든 수치는 추정. 결과 카드에 "추정" 배지 필수.

- 신규입찰단가: 130원/kWh (해외 CfD/CME 사례 참고)
  - slider 100 ~ 200원/kWh
- 계약기간: 20년 (현행 RPS 표준 + 업계 추정)
  - slider 15 ~ 25년
- 시작 연도: 2027
- 인플레 연동: 옵션, 디폴트 미연동

## Scenario D — Direct PPA

- PPA 단가: 160원/kWh (디폴트, 사용자 협상력에 따라 가변)
  - slider 130 ~ 200원/kWh
- 한전 송배전 이용료(망 사용료): 12원/kWh
  - 출처: 한전 송배전 사용료 약관 기준 추정 (전압별·계약종별 평균)
  - slider 5 ~ 20원/kWh (지역·전압급별 차이)
- 계약기간: 10년 (slider 5 ~ 20년)
- REC 별도 거래: 디폴트 미포함 (PPA 단가에 흡수), 옵션 토글로 분리 거래

## REC Weights

`docs/scenarios.md §0-1` 참조. 산업통상자원부 RPS 운영지침 고시 검증 후 갱신.
부지(general/building/forest/water) × 용량(<100kW / 100kW~3MW / ≥3MW) 표.

## Update Policy
- 가정 값 변경 시 본 문서와 `/lib/defaults/`를 동시 갱신.
- 정책/제도 변경 시 영향 받는 시나리오 결과 카드에 경고 배지 표시.
- 모든 가정 값에는 코드 주석 (`// see docs/assumptions.md#...`)과 출처 명시.
