"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { path: "/wizard/step-1-user-type", label: "① 사용자" },
  { path: "/wizard/step-2-location", label: "② 위치" },
  { path: "/wizard/step-3-equipment", label: "③ 발전소" },
  { path: "/wizard/step-4-operation", label: "④ 운영" },
  { path: "/wizard/step-5-financial", label: "⑤ 재무" },
];

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentIdx = STEPS.findIndex((s) => pathname.startsWith(s.path));
  const progress =
    currentIdx >= 0 ? ((currentIdx + 1) / STEPS.length) * 100 : 0;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b z-10 p-3 sm:p-4">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="flex items-center justify-between text-sm">
            <Link
              href="/"
              className="text-muted-foreground hover:underline"
            >
              ← 랜딩
            </Link>
            <span className="text-xs text-muted-foreground">
              {currentIdx >= 0 ? `${currentIdx + 1} / ${STEPS.length}` : ""}
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
            {STEPS.map((s, i) => (
              <span
                key={s.path}
                className={
                  i === currentIdx
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </header>
      <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
        {children}
      </div>
    </main>
  );
}
