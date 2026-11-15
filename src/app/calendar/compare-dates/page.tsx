import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareDatesExplorer } from "@/compare-dates/compare-dates-explorer";

export const metadata: Metadata = {
  title: "Comparar datas | HERU",
  description:
    "A mesma região em dois períodos de mesma duração, na mesma escala de cor.",
};

export default function CompareDatesPage() {
  return (
    <Suspense>
      <CompareDatesExplorer />
    </Suspense>
  );
}
