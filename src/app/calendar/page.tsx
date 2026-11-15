import type { Metadata } from "next";
import { Suspense } from "react";
import { AreaFilters } from "@/area-filters/area-filters";

export const metadata: Metadata = {
  title: "Calendar | HERU",
  description: "Choose the year, continent and country to see the hotspots.",
};

export default function CalendarFiltersPage() {
  return (
    <Suspense>
      <AreaFilters />
    </Suspense>
  );
}
