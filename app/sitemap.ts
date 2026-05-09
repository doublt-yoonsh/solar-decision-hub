import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://solar-decision-hub.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: ReadonlyArray<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/wizard/step-1-user-type", priority: 0.8, changeFrequency: "monthly" },
    { path: "/wizard/step-2-location", priority: 0.6, changeFrequency: "monthly" },
    { path: "/wizard/step-3-equipment", priority: 0.6, changeFrequency: "monthly" },
    { path: "/wizard/step-4-operation", priority: 0.6, changeFrequency: "monthly" },
    { path: "/wizard/step-5-financial", priority: 0.6, changeFrequency: "monthly" },
    { path: "/result", priority: 0.9, changeFrequency: "weekly" },
    { path: "/docs", priority: 0.5, changeFrequency: "monthly" },
    { path: "/test-location", priority: 0.3, changeFrequency: "monthly" },
  ];

  return pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified,
    priority: p.priority,
    changeFrequency: p.changeFrequency,
  }));
}
