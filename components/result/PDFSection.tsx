"use client";

import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Report } from "@/lib/pdf/Report";
import type { PlantInput } from "@/lib/types/PlantInput";
import type { SimulationOutput } from "@/lib/simulator";
import type { PortfolioMetrics } from "@/lib/types/PortfolioMetrics";
import type { BenchmarkResult } from "@/lib/benchmark";

// Lazy-load PDFDownloadLink so the heavy @react-pdf/renderer bundle is only
// fetched when this component mounts (i.e. user clicked "PDF 준비").
const PDFDownloadLink = dynamic(
  () =>
    import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" disabled>
        📄 준비 중...
      </Button>
    ),
  },
);

export interface PDFSectionProps {
  plant: PlantInput;
  sim: SimulationOutput;
  portfolio: PortfolioMetrics;
  benchmark: BenchmarkResult;
  performanceRatio: number;
  discountRate: number;
}

export default function PDFSection({
  plant,
  sim,
  portfolio,
  benchmark,
  performanceRatio,
  discountRate,
}: PDFSectionProps) {
  return (
    <PDFDownloadLink
      document={
        <Report
          plant={plant}
          sim={sim}
          portfolio={portfolio}
          benchmark={benchmark}
          performanceRatio={performanceRatio}
          discountRate={discountRate}
        />
      }
      fileName={`solar-report-${plant.id}.pdf`}
      className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 h-10 border border-input bg-background hover:bg-accent transition-colors"
    >
      {({ loading }) => (loading ? "준비 중..." : "📄 PDF 다운로드")}
    </PDFDownloadLink>
  );
}
