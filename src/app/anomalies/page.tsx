import type { Metadata } from "next";
import { Suspense } from "react";
import { AnomaliesExplorer } from "@/anomalies/anomalies-explorer";

export const metadata: Metadata = {
  title: "Anomalias | HERU",
  description:
    "Os meses que fugiram do padrão desde 2003 e o último mês comparado com o típico.",
};

export default function AnomaliesPage() {
  return (
    <Suspense>
      <AnomaliesExplorer />
    </Suspense>
  );
}
