"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/lib/store/wizard";
import { DEMO_PRESETS } from "@/lib/store/demo";

export default function Home() {
  const router = useRouter();
  const loadFromPlants = useWizardStore((s) => s.loadFromPlants);

  const startDemo = (id: string) => {
    const preset = DEMO_PRESETS.find((d) => d.id === id);
    if (!preset) return;
    loadFromPlants([...preset.plants]);
    router.push("/result");
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <header className="space-y-2 text-center sm:text-left py-6 sm:py-10">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
          RPS 폐지 시대, 내 발전소는 어디로 가야 할까?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          4가지 시장 시나리오를 실제 데이터로 비교하세요. 벤치마킹 + 시나리오
          시뮬레이션 + 포트폴리오 리스크 한 번에.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>🚀 데모로 5초 시작</CardTitle>
          <CardDescription>
            아래 프리셋을 클릭하면 즉시 결과 화면으로 이동합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {DEMO_PRESETS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => startDemo(d.id)}
              className="text-left rounded-md border p-4 hover:bg-accent transition-colors space-y-1"
            >
              <p className="font-medium text-sm">{d.label}</p>
              <p className="text-xs text-muted-foreground">{d.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>✏️ 내 발전소 입력</CardTitle>
          <CardDescription>
            5단계 위저드로 발전소 정보를 직접 입력합니다 (모바일 최적화)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/wizard/step-1-user-type">위저드 시작</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🧪 위치 인리치 테스트</CardTitle>
          <CardDescription>
            mock 모드로 좌표 → 주소·일사량·부지·변전소 매핑 확인
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/test-location">테스트 페이지</Link>
          </Button>
        </CardContent>
      </Card>

      <footer className="text-xs text-muted-foreground border-t pt-4 space-y-1">
        <p>
          본 도구의 추정값은 공개 데이터 기반이며 ±10% 오차가 있을 수 있습니다.
          실제 사업 결정은 현장 조사와 전문가 자문이 필요합니다.
        </p>
        <p>
          v0.1.0 · 데이터 출처: KPX, 한국에너지공단, 산업통상자원부, 기상청 ASOS
        </p>
      </footer>
    </main>
  );
}
