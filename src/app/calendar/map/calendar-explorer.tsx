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
  type AreaOption,
  CalendarFilters,
  type YearRange,
} from "@/fire-calendar/calendar-filters";
import { CalendarGrid } from "@/fire-calendar/calendar-grid";
import {
  enabledMonthsLabel,
  formatUpdatedAt,
  PASSES_DESCRIPTIONS,
  SOURCE_SHORT_UNITS,
  SOURCE_UNITS,
} from "@/fire-calendar/calendar-labels";
import {
  buildCalendarYears,
  CALENDAR_FIRST_YEAR,
  type CalendarPasses,
  type CalendarSource,
  type CellState,
  hasHarmonizedValues,
} from "@/fire-calendar/calendar-matrix";
import { CalendarReports } from "@/fire-calendar/calendar-reports";
import { analyzeCalendar } from "@/fire-calendar/calendar-statistics";
import { HeatLegend } from "@/fire-calendar/heat-legend";
import {
  closedMonthComparison,
  currentMonthComparison,
} from "@/fire-calendar/month-comparison";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import { type CountryRow, countryName } from "@/pipeline/pipeline-countries";
import { type CoverageRow, readCoverage } from "@/pipeline/pipeline-coverage";
import {
  reloadPipelineFile,
  useBatchPolling,
  usePipelineFile,
} from "@/pipeline/pipeline-files";
import {
  type SeriesDayRow,
  type SeriesMonthRow,
  seriesPath,
  WORLD_AREA,
} from "@/pipeline/series-row";

const MapSection = dynamic(
  () => import("@/fire-map/map-section").then((module) => module.MapSection),
  {
    ssr: false,
    loading: () => (
      <div className="mt-12 h-[600px] animate-pulse rounded-lg border border-line bg-surface" />
    ),
  },
);

const DEFAULT_AREA = "BOL";
const COVERAGE_PATH = "meta/coverage.csv";
const COUNTRIES_PATH = "meta/countries.csv";
const ALL_MONTHS: boolean[] = Array(12).fill(true);

function CalendarMessage({
  title,
  text,
  onRetry,
}: {
  title: string;
  text: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role={onRetry ? "alert" : "status"}
      className="flex flex-col items-start gap-3 rounded-md border border-line bg-surface p-6"
    >
      <p className="type-heading-sm flex items-center gap-2 text-ink">
        <MaterialSymbol
          name={onRetry ? "error" : "progress_activity"}
          className={`size-5 ${onRetry ? "text-alert" : "animate-spin text-ink-muted"}`}
        />
        {title}
      </p>
      <p className="type-body text-ink-muted">{text}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="type-button inline-flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-line-strong bg-surface-raised px-4 text-ink transition-colors duration-120 ease-standard hover:border-ink"
        >
          <MaterialSymbol name="refresh" className="size-[18px]" />
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function CalendarExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const latest = useBatchPolling();
  const coverageFile = usePipelineFile<CoverageRow>(COVERAGE_PATH);
  const countriesFile = usePipelineFile<CountryRow>(COUNTRIES_PATH);
  const countries = countriesFile.rows;
  const outlines = useCountryOutlines();
  const requestedArea = searchParams.get("area") ?? DEFAULT_AREA;
  const area =
    requestedArea === WORLD_AREA ||
    !countries ||
    countries.some((country) => country.iso3 === requestedArea)
      ? requestedArea
      : DEFAULT_AREA;
  const monthlyPath = seriesPath("monthly", area);
  const dailyPath = seriesPath("daily", area);
  const monthlyFile = usePipelineFile<SeriesMonthRow>(monthlyPath);
  const dailyFile = usePipelineFile<SeriesDayRow>(dailyPath);

  const [chosenSource, setChosenSource] = useState<CalendarSource | null>(null);
  const [passes, setPasses] = useState<CalendarPasses>("all");
  const [chosenRange, setChosenRange] = useState<YearRange | null>(null);
  const [enabledMonths, setEnabledMonths] = useState(ALL_MONTHS);

  const coverage = useMemo(
    () => (coverageFile.rows ? readCoverage(coverageFile.rows) : null),
    [coverageFile.rows],
  );
  const monthlyRows = monthlyFile.rows;
  const source: CalendarSource =
    chosenSource ??
    (monthlyRows && !hasHarmonizedValues(monthlyRows) ? "modis" : "harmonized");

  const years = useMemo(
    () =>
      coverage && monthlyRows
        ? buildCalendarYears(monthlyRows, coverage, source, passes)
        : [],
    [coverage, monthlyRows, source, passes],
  );
  const yearNumbers = years.map((year) => year.year);
  const firstYear = Math.max(chosenRange?.first ?? 0, yearNumbers[0] ?? 0);
  const lastYear = Math.min(
    chosenRange?.last ?? Infinity,
    yearNumbers.at(-1) ?? 0,
  );
  const visibleYears = useMemo(
    () =>
      years.filter((year) => year.year >= firstYear && year.year <= lastYear),
    [years, firstYear, lastYear],
  );
  const analysis = useMemo(
    () => analyzeCalendar(years, visibleYears, enabledMonths),
    [years, visibleYears, enabledMonths],
  );
  const lastDataDate = coverage?.lastDataDate ?? null;
  const closedMonth = useMemo(
    () => closedMonthComparison(years, analysis),
    [years, analysis],
  );
  const currentMonth = useMemo(
    () =>
      dailyFile.rows && lastDataDate
        ? currentMonthComparison(
            dailyFile.rows,
            years,
            analysis,
            source,
            passes,
            lastDataDate,
          )
        : null,
    [dailyFile.rows, years, analysis, source, passes, lastDataDate],
  );

  const areaOptions = useMemo<AreaOption[]>(
    () =>
      countries
        ? [
            { value: WORLD_AREA, label: "Mundo" },
            ...countries
              .map((country) => ({
                value: country.iso3,
                label: countryName(country),
              }))
              .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
          ]
        : [],
    [countries],
  );
  const areaName =
    areaOptions.find((option) => option.value === area)?.label ?? "";
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
            icon:
              area === WORLD_AREA
                ? ("public" as const)
                : ("location_on" as const),
            text: areaName,
          },
        ]
      : []),
  ];

  const changeArea = (next: string) => {
    router.replace(areaMapHref(next, selectedYear), { scroll: false });
  };

  const toggleMonth = (index: number) => {
    setEnabledMonths(enabledMonths.map((on, i) => (i === index ? !on : on)));
  };

  const clearFilters = () => {
    setChosenSource(null);
    setPasses("all");
    setChosenRange(null);
    setEnabledMonths(ALL_MONTHS);
  };

  const outlierKeys = new Set(analysis.outliers.map((cell) => cell.key));
  const downloadCalendar = () => {
    const lines = visibleYears.flatMap((year) =>
      year.cells
        .filter(
          (cell, index) => enabledMonths[index] && cell.state !== "future",
        )
        .map((cell) =>
          [
            cell.year,
            cell.month,
            cell.value ?? "",
            cell.state,
            cell.origin ?? "",
            cell.partial ? 1 : 0,
            cell.provisional ? 1 : 0,
            outlierKeys.has(cell.key) ? 1 : 0,
          ].join(","),
        ),
    );
    const csv = [
      "ano,mes,valor,estado,origem,parcial,preliminar,fora_do_padrao",
      ...lines,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `heru-calendario-${area}-${source}-${passes}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const states = new Set<CellState>(
    visibleYears.flatMap((year) => year.cells.map((cell) => cell.state)),
  );
  const failedPaths = (
    [
      [COVERAGE_PATH, coverageFile],
      [monthlyPath, monthlyFile],
    ] as const
  )
    .filter(([, file]) => file.error && !file.rows)
    .map(([path]) => path);
  const ready = years.length > 0 && lastDataDate !== null;
  const updatedAt = latest.rows?.[0]?.updated_at;

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
          href={areaFiltersHref(
            area === WORLD_AREA ? null : area,
            selectedYear,
          )}
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          <MaterialSymbol name="tune" className="size-[18px]" />
          Editar
        </Link>
      </section>

      {coverage && lastDataDate && selectedYear && (
        <MapSection
          area={area === WORLD_AREA ? null : area}
          areaName={areaName}
          year={selectedYear}
          outline={area === WORLD_AREA ? null : (outlines?.[area] ?? null)}
          coverage={coverage}
          dailyRows={dailyFile.rows}
          calendarYears={years}
        />
      )}

      {ready && (
        <CalendarReports
          areaName={areaName}
          subtitle={`${yearNumbers[0]}-${yearNumbers.at(-1)} · ${SOURCE_SHORT_UNITS[source]}`}
          analysis={analysis}
          closedMonth={closedMonth}
          currentMonth={currentMonth}
          source={source}
        />
      )}

      <section
        aria-labelledby="calendar-title"
        className="mt-12 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 id="calendar-title" className="type-section-title text-ink">
            Calendário de fogo
          </h2>
          <p className="type-body-sm text-ink-muted">
            Cada linha é um ano e cada coluna, um mês. Os mesmos limites de cor
            valem para o calendário inteiro.
          </p>
        </div>
        <CalendarFilters
          areaOptions={areaOptions}
          area={area}
          onAreaChange={changeArea}
          source={source}
          onSourceChange={setChosenSource}
          passes={passes}
          onPassesChange={setPasses}
          years={yearNumbers}
          yearRange={{ first: firstYear, last: lastYear }}
          onYearRangeChange={setChosenRange}
          enabledMonths={enabledMonths}
          onToggleMonth={toggleMonth}
          onClear={clearFilters}
          onDownload={ready ? downloadCalendar : null}
          unitLine={`${SOURCE_UNITS[source]} · ${PASSES_DESCRIPTIONS[passes]} · ${enabledMonthsLabel(enabledMonths)}`}
          notice={
            chosenSource === null && source === "modis"
              ? "O valor harmonizado desta região ainda está em cálculo. Mostrando só MODIS até ele sair."
              : null
          }
        />
        {failedPaths.length > 0 ? (
          <CalendarMessage
            title="Não conseguimos carregar o calendário agora."
            text="A fonte dos dados não respondeu. Seus filtros continuam salvos."
            onRetry={() => failedPaths.forEach(reloadPipelineFile)}
          />
        ) : !ready ? (
          <CalendarMessage
            title="Carregando o calendário"
            text="Lendo a série mensal da região."
          />
        ) : (
          <div className="rounded-md border border-line bg-surface p-3 sm:p-6">
            <CalendarGrid
              areaName={areaName}
              years={visibleYears}
              allYears={years}
              analysis={analysis}
              enabledMonths={enabledMonths}
              source={source}
              lastDataDate={lastDataDate}
            />
            <HeatLegend breaks={analysis.breaks} states={states} />
          </div>
        )}
      </section>

      <p className="type-body-sm mt-8 flex flex-wrap gap-x-4 gap-y-1 text-ink-muted">
        <span>
          Dados: NASA FIRMS, MODIS (desde 2003) e VIIRS (desde 2012),
          harmonizados para equivalente VIIRS.
          {updatedAt && ` Atualizado em ${formatUpdatedAt(updatedAt)}.`}
        </span>
        <Link href="/methodology" className="text-link hover:underline">
          Como harmonizamos
        </Link>
      </p>
    </main>
  );
}
