"use client";

import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWizardStore, type UserType } from "@/lib/store/wizard";

const OPTIONS: ReadonlyArray<{
  id: UserType;
  label: string;
  desc: string;
}> = [
  {
    id: "new",
    label: "신규 사업 검토",
    desc: "발전소 신설 전 시나리오 비교가 목적",
  },
  {
    id: "operator",
    label: "운영 중 (1개)",
    desc: "이미 운영 중인 발전소의 진단 + 시나리오 비교",
  },
  {
    id: "multi",
    label: "다수 발전소 운영자",
    desc: "포트폴리오 리스크 분석 + 시나리오 비교 (v1.x 안내: 현재는 단일 발전소만 입력 가능 — 다수 입력 UI는 다음 버전에서 제공)",
  },
];

export default function Step1Page() {
  const router = useRouter();
  const userType = useWizardStore((s) => s.userType);
  const setUserType = useWizardStore((s) => s.setUserType);
  const setStep = useWizardStore((s) => s.setStep);

  const handleNext = () => {
    if (!userType) return;
    setStep(2);
    router.push("/wizard/step-2-location");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>먼저, 사용 목적을 알려주세요</CardTitle>
          <CardDescription>
            이후 위저드 단계와 결과 화면 구성에 영향을 줍니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setUserType(o.id)}
              className={`w-full text-left rounded-md border p-3 transition-colors ${
                userType === o.id
                  ? "border-primary bg-accent"
                  : "hover:bg-accent"
              }`}
            >
              <p className="font-medium text-sm">{o.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
            </button>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!userType}>
          다음 →
        </Button>
      </div>
    </div>
  );
}
