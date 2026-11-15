import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarExplorer } from "./calendar-explorer";

export const metadata: Metadata = {
  title: "Map and calendar | HERU",
  description:
    "Hotspots on the map and by month since 2003, with MODIS and VIIRS on the same scale.",
};

export default function CalendarMapPage() {
  return (
    <Suspense>
      <CalendarExplorer />
    </Suspense>
  );
}
