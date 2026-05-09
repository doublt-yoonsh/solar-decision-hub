import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DocsPage() {
  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 랜딩
        </Link>
        <Button variant="outline" size="sm" asChild>
          <Link href="/result">결과로 돌아가기</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>가정 및 한계</CardTitle>
          <CardDescription>
            본 도구가 사용하는 모든 가정값, 출처, 그리고 한계를 한눈에
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <section>
            <h2 className="font-semibold mb-1">발전 효율 (Performance Ratio)</h2>
            <p className="text-muted-foreground">
              디폴트 <strong>0.85</strong> — 한국 PV 시스템 실측 평균(모듈 +
              인버터 + 전선 + 토양 손실 종합). 보수 0.80, 낙관 0.88. 위저드
              5단계에서 슬라이더 0.65~0.90으로 조정 가능합니다.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1">발전량 열화율</h2>
            <p className="text-muted-foreground">
              연 0.5% — 단결정 PV 표준. 20년차 = 1년차 × 90.9%.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1">REC 가중치</h2>
            <p className="text-muted-foreground">
              부지(general/building/forest/water) × 용량(&lt;100kW / 100kW~3MW
              / ≥3MW) 매트릭스. 출처: 산업통상자원부 RPS 운영지침. 위저드 3단계에서
              자동 매핑되며 사용자가 직접 입력하여 오버라이드 가능합니다.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-1">4 시나리오 매출 공식</h2>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>
                <strong>A 현물시장</strong>: 발전량 × SMP + (발전량/1000) ×
                가중치 × REC가. 2027년부터 신규 REC 발급 0 가정.
              </li>
              <li>
                <strong>B 고정가격</strong>: 발전량 × [smpBaseValue + recValue ×
                (사용자가중치 / 1.0)]. smpBaseValue 80원/kWh로 추정 분해
                (smpBaseSource: estimated).
              </li>
              <li>
                <strong>C 2027 신규입찰</strong>: 발전량 × 신규입찰단가
                (디폴트 130원, 슬라이더 100~200). 정책 미확정 — 모든 수치
                추정.
              </li>
              <li>
                <strong>D 직접 PPA</strong>: 발전량 × [PPA단가 + RE100프리미엄
                − 송배전이용료]. 디폴트 PPA 160원, 송배전 12원.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-1">데이터 출처</h2>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>KPX 전력거래소 — 월간 SMP (육지/제주 분리, 시드)</li>
              <li>한국에너지공단 RPS 시스템 — 월간 REC 평균 (시드)</li>
              <li>한국에너지공단 입찰 결과공고 — 분기별 낙찰가</li>
              <li>공공데이터포털 — 한전 송변전 GeoJSON (12개 시드)</li>
              <li>기상청 ASOS — 시도 평균 일사량 (PR≈0.85 baseline)</li>
              <li>산업부 + 언론 보도 종합 — 출력제어 통계 (추정)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-1">신뢰도 레벨</h2>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>
                <strong>High</strong>: 가중치 표 (산업부 고시 기반)
              </li>
              <li>
                <strong>Medium</strong>: SMP/REC/입찰가/일사량 (월별 평균 시드)
              </li>
              <li>
                <strong>Low</strong>: 변전소(12개 시드), 출력제어(추정 종합)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-1">한계</h2>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>SMP/REC 일별 시계열은 v1.x에서 보강 예정 (현재 월별 시드)</li>
              <li>변전소 매칭은 12개 시드 — 50km 초과 시 권역 평균 폴백</li>
              <li>출력제어는 공식 통합 통계 부재 — 산업부 + 언론 종합 추정</li>
              <li>시나리오 C는 정책 미확정 — 정부 발표 후 재검토 필요</li>
              <li>
                추정값은 ±10% 오차 가능. 실제 사업 결정은 현장 조사 + 전문가
                자문 필수.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-1">로드맵</h2>
            <p className="text-muted-foreground">
              v1.x: SMP-zero 시간대별 시드, 변전소 600+ 풀 데이터, GK-2A 위성
              일사량. v2: 출처 구분 필드 일관화 (모든 시나리오에 source
              metadata).
            </p>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
