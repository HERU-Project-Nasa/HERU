import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareRegionsExplorer } from "@/compare-regions/compare-regions-explorer";

export const metadata: Metadata = {
  title: "Compare regions | HERU",
  description:
    "Up to four countries over the same period, in total hotspots or per area.",
};

export default function CompareRegionsPage() {
  return (
    <Suspense>
      <CompareRegionsExplorer />
    </Suspense>
  );
}
