"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { areaFiltersHref, areaMapHref } from "@/area-filters/area-links";
import { findContinent } from "@/area-filters/continents";
import { buttonClassName } from "@/button/button-class-name";
import { useCountryOutlines } from "@/country-outlines/country-outlines";
import { SOURCE_SHORT_UNITS } from "@/fire-calendar/calendar-labels";
import { CALENDAR_FIRST_YEAR } from "@/fire-calendar/calendar-matrix";
import { CalendarReports } from "@/fire-calendar/calendar-reports";
import {
  CalendarSection,
  DataFootnote,
} from "@/fire-calendar/calendar-section";
import { useAreaCalendar } from "@/fire-calendar/use-area-calendar";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import { WORLD_AREA } from "@/pipeline/series-row";

const MapSection = dynamic(
  () => import("@/fire-map/map-section").then((module) => module.MapSection),
  {
    ssr: false,
    loading: () => (
      <div className="mt-12 h-[600px] animate-pulse rounded-lg border border-line bg-surface" />
    ),
  },
);

export function CalendarExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const calendar = useAreaCalendar(searchParams.get("area"));
  const outlines = useCountryOutlines();
  const { area, areaName, countries, coverage, lastDataDate, years } = calendar;
  const world = area === WORLD_AREA;
  const continent = findContinent(
    countries?.find((country) => country.iso3 === area)?.continent,
  );
  const dataYear = lastDataDate ? Number(lastDataDate.slice(0, 4)) : null;
  const requestedYear = Number(searchParams.get("year"));
  const selectedYear =
    dataYear === null
      ? null
      : requestedYear >= CALENDAR_FIRST_YEAR && requestedYear <= dataYear
        ? requestedYear
        : dataYear;
  const appliedChips: { icon: SymbolName; text: string }[] = [
    ...(selectedYear
      ? [{ icon: "calendar_month" as const, text: String(selectedYear) }]
      : []),
    ...(continent ? [{ icon: continent.icon, text: continent.name }] : []),
    ...(areaName
      ? [
          {
            icon: world ? ("public" as const) : ("location_on" as const),
            text: areaName,
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto max-w-[1328px] px-4 pt-6 pb-24 sm:px-8 lg:px-16 lg:pt-8">
      <h1 className="sr-only">
        Mapa e calendário de focos de calor{areaName ? `, ${areaName}` : ""}
      </h1>
      <section
        aria-label="Filtros de pesquisa aplicados"
        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-caption mr-2 text-ink-muted">
            Filtros de pesquisa
          </span>
          {appliedChips.map((chip) => (
            <span
              key={chip.text}
              className="type-chip flex h-8 items-center gap-1.5 rounded-sm bg-surface-raised px-2.5 text-ink"
            >
              <MaterialSymbol name={chip.icon} className="size-4" />
              {chip.text}
            </span>
          ))}
        </div>
        <Link
          href={areaFiltersHref(world ? null : area, selectedYear)}
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          <MaterialSymbol name="tune" className="size-[18px]" />
          Editar
        </Link>
      </section>

      {coverage && lastDataDate && selectedYear && (
        <MapSection
          area={world ? null : area}
          areaName={areaName}
          year={selectedYear}
          outline={world ? null : (outlines?.[area] ?? null)}
          coverage={coverage}
          dailyRows={calendar.dailyRows}
          calendarYears={years}
        />
      )}

      {calendar.ready && (
        <CalendarReports
          areaName={areaName}
          subtitle={`${years[0].year}-${years.at(-1)!.year} · ${SOURCE_SHORT_UNITS[calendar.source]}`}
          analysis={calendar.analysis}
          closedMonth={calendar.closedMonth}
          currentMonth={calendar.currentMonth}
          source={calendar.source}
        />
      )}

      <CalendarSection
        calendar={calendar}
        onAreaChange={(next) =>
          router.replace(areaMapHref(next, selectedYear), { scroll: false })
        }
        title="Calendário de fogo"
        description="Cada linha é um ano e cada coluna, um mês. Os mesmos limites de cor valem para o calendário inteiro."
        initialMode="count"
        focusRequest={null}
      />

      <DataFootnote updatedAt={calendar.updatedAt} />
    </main>
  );
}
