import type { Metadata } from "next";
import { Suspense } from "react";
import { AreaFilters } from "@/area-filters/area-filters";

export const metadata: Metadata = {
  title: "Calendário | HERU",
  description:
    "Escolha o ano, o continente e o país para ver os focos de calor.",
};

export default function CalendarFiltersPage() {
  return (
    <Suspense>
      <AreaFilters />
    </Suspense>
  );
}
