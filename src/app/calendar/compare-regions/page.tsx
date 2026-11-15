import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareRegionsExplorer } from "@/compare-regions/compare-regions-explorer";

export const metadata: Metadata = {
  title: "Comparar regiões | HERU",
  description:
    "Até quatro países no mesmo período, em total de focos ou por área.",
};

export default function CompareRegionsPage() {
  return (
    <Suspense>
      <CompareRegionsExplorer />
    </Suspense>
  );
}
