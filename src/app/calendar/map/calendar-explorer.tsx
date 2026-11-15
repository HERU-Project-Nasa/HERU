"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { areaFiltersHref, areaMapHref } from "@/area-filters/area-links";
import { findContinent } from "@/area-filters/continents";
import { buttonClassName } from "@/button/button-class-name";
import { useCountryOutlines } from "@/country-outlines/country-outlines";
import {
  capitalized,
  SOURCE_SHORT_UNITS,
} from "@/fire-calendar/calendar-labels";
import { CALENDAR_FIRST_YEAR } from "@/fire-calendar/calendar-matrix";
import {
  CalendarReports,
  type PeriodReport,
  type ReportKind,
} from "@/fire-calendar/calendar-reports";
import {
  CalendarSection,
  DataFootnote,
} from "@/fire-calendar/calendar-section";
import { periodComparison } from "@/fire-calendar/month-comparison";
import { useAreaCalendar } from "@/fire-calendar/use-area-calendar";
import {
  dateRangeLabel,
  type MapPeriod,
  partialDaysLabel,
  periodLabel,
  periodName,
  presetPeriod,
  yearPeriodEnd,
} from "@/fire-map/map-period";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import { FadeUp } from "@/motion/fade-up";
import { WORLD_AREA } from "@/pipeline/series-row";
import { ReportEvidence } from "@/report-evidence/report-evidence";

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
  const [evidence, setEvidence] = useState<ReportKind | null>(null);
  const [focusRequest, setFocusRequest] = useState<string | null>(null);
  const [chosenPeriod, setChosenPeriod] = useState<MapPeriod | null>(null);
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
  const periodEnd =
    lastDataDate && selectedYear
      ? yearPeriodEnd(selectedYear, lastDataDate)
      : null;
  const defaultPeriod = useMemo(
    () => (periodEnd ? presetPeriod("7d", periodEnd) : null),
    [periodEnd],
  );
  const period = chosenPeriod ?? defaultPeriod;
  const completeDate = coverage?.completeDate ?? null;
  const { dailyRows, analysis, source, passes, ready } = calendar;
  const periodReport = useMemo<PeriodReport | null>(() => {
    if (!period || !dailyRows || !completeDate || !ready) {
      return null;
    }
    const comparison = periodComparison(
      dailyRows,
      years,
      analysis,
      source,
      passes,
      period,
      completeDate,
    );
    if (!comparison) {
      return null;
    }
    const partial = partialDaysLabel(period, completeDate);
    return {
      comparison,
      eyebrow: periodName(period),
      title: periodLabel({
        ...period,
        start: comparison.start,
        end: comparison.end,
        hours: null,
      }),
      dates: dateRangeLabel(comparison.start, comparison.end),
      note:
        [
          partial && `${capitalized(partial)}, fora da comparação.`,
          period.hours && "Contamos dias UTC inteiros.",
        ]
          .filter(Boolean)
          .join(" ") || null,
    };
  }, [period, dailyRows, completeDate, ready, years, analysis, source, passes]);
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
      <FadeUp>
        <section
          aria-label="Filtros de pesquisa aplicados"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-linear-to-b from-surface-hover/60 to-surface px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="type-caption mr-2 flex items-center gap-2 text-ink-muted">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-data-burned"
              />
              Filtros de pesquisa
            </span>
            {appliedChips.map((chip) => (
              <span
                key={chip.text}
                className="type-chip flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface-raised px-3 text-ink"
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
      </FadeUp>

      {coverage && lastDataDate && selectedYear && period && (
        <FadeUp delay={0.1} onScroll>
          <MapSection
            area={world ? null : area}
            areaName={areaName}
            year={selectedYear}
            outline={world ? null : (outlines?.[area] ?? null)}
            coverage={coverage}
            dailyRows={calendar.dailyRows}
            calendarYears={years}
            period={period}
            onPeriodChange={setChosenPeriod}
          />
        </FadeUp>
      )}

      {calendar.ready && (
        <FadeUp onScroll>
          <CalendarReports
            areaName={areaName}
            subtitle={`${calendar.analysis.firstYear}-${calendar.analysis.lastYear} · ${SOURCE_SHORT_UNITS[calendar.source]}`}
            analysis={calendar.analysis}
            closedMonth={calendar.closedMonth}
            currentMonth={calendar.currentMonth}
            source={calendar.source}
            period={periodReport}
            onEvidence={setEvidence}
          />
        </FadeUp>
      )}

      {evidence && calendar.ready && (
        <ReportEvidence
          kind={evidence}
          calendar={calendar}
          period={periodReport}
          onClose={() => setEvidence(null)}
          onShow={(key) => {
            setEvidence(null);
            setFocusRequest(`${key}#${Date.now()}`);
          }}
        />
      )}

      <FadeUp onScroll>
        <CalendarSection
          calendar={calendar}
          onAreaChange={(next) =>
            router.replace(areaMapHref(next, selectedYear), { scroll: false })
          }
          title="Calendário de fogo"
          description="Cada linha é um ano e cada coluna, um mês. Os mesmos limites de cor valem para o calendário inteiro."
          initialMode="count"
          focusRequest={focusRequest}
        />
      </FadeUp>

      <DataFootnote updatedAt={calendar.updatedAt} />
    </main>
  );
}
