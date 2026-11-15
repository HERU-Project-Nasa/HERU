import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarExplorer } from "./calendar-explorer";

export const metadata: Metadata = {
  title: "Mapa e calendário | HERU",
  description:
    "Focos de calor no mapa e por mês desde 2003, com MODIS e VIIRS na mesma escala.",
};

export default function CalendarMapPage() {
  return (
    <Suspense>
      <CalendarExplorer />
    </Suspense>
  );
}
