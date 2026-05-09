"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWizardStore } from "@/lib/store/wizard";

export default function Step4Page() {
  const router = useRouter();
  const plant =
    useWizardStore((s) => s.plants[s.activePlantIndex]) ?? {};
  const updatePlant = useWizardStore((s) => s.updatePlant);
  const setStep = useWizardStore((s) => s.setStep);

  const [commissioningDate, setCommissioningDate] = useState(
    plant.commissioningDate ?? "",
  );
  const [planned, setPlanned] = useState(!plant.commissioningDate);

  const handleNext = () => {
    if (!planned && commissioningDate) {
      updatePlant({ commissioningDate });
    }
    setStep(5);
    router.push("/wizard/step-5-financial");
  };

  const handleSkip = () => {
    setStep(5);
    router.push("/wizard/step-5-financial");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>운영 정보 (선택)</CardTitle>
          <CardDescription>
            이미 운영 중이라면 시작일을 입력하고, 신규라면 「예정」을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={planned}
              onChange={(e) => setPlanned(e.target.checked)}
            />
            신규 (아직 운영 시작 전)
          </label>

          {!planned && (
            <div className="space-y-1">
              <label
                className="text-sm font-medium"
                htmlFor="commissioningDate"
              >
                상업운전 개시일
              </label>
              <Input
                id="commissioningDate"
                type="date"
                value={commissioningDate}
                onChange={(e) => setCommissioningDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                정책 리스크 분석 시 RPS sunset(2027) 인근 신설 비중 계산에 사용
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          ← 뒤로
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            건너뛰기
          </Button>
          <Button onClick={handleNext}>다음 →</Button>
        </div>
      </div>
    </div>
  );
}
