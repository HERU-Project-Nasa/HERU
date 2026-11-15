import type { Metadata } from "next";
import { Suspense } from "react";
import { AnomaliesExplorer } from "@/anomalies/anomalies-explorer";

export const metadata: Metadata = {
  title: "Anomalies | HERU",
  description:
    "The unusual months since 2003, and the last month compared with typical.",
};

export default function AnomaliesPage() {
  return (
    <Suspense>
      <AnomaliesExplorer />
    </Suspense>
  );
}
