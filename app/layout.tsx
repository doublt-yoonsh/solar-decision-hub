import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://solar-decision-hub.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Solar Decision Hub — 태양광 의사결정 대시보드",
    template: "%s | Solar Decision Hub",
  },
  description:
    "태양광 발전사업자를 위한 통합 의사결정 대시보드. RPS 폐지(2027) 시대를 대비한 4가지 시나리오 비교, 동급 벤치마킹, 포트폴리오 리스크 분석.",
  keywords: [
    "태양광",
    "RPS 폐지",
    "REC 일몰",
    "발전소 수익성",
    "SMP",
    "고정가격계약",
    "직접 PPA",
    "출력제어",
    "포트폴리오 분석",
  ],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "Solar Decision Hub",
    description: "RPS 폐지 시대, 내 발전소는 어디로 가야 할까?",
    url: SITE_URL,
    siteName: "Solar Decision Hub",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Solar Decision Hub",
    description: "RPS 폐지 시대, 내 발전소는 어디로 가야 할까?",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn("font-sans", inter.variable)}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
