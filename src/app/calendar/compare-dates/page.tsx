import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareDatesExplorer } from "@/compare-dates/compare-dates-explorer";

export const metadata: Metadata = {
  title: "Compare dates | HERU",
  description:
    "The same region over two periods of equal length, on the same color scale.",
};

export default function CompareDatesPage() {
  return (
    <Suspense>
      <CompareDatesExplorer />
    </Suspense>
  );
}
