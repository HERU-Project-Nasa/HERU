import { useMemo, useState } from "react";
import { type CountryRow, countryName } from "@/pipeline/pipeline-countries";
import {
  type CoverageRow,
  type PipelineCoverage,
  readCoverage,
} from "@/pipeline/pipeline-coverage";
import {
  type PipelineFile,
  useBatchPolling,
  usePipelineFile,
} from "@/pipeline/pipeline-files";
import {
  type SeriesDayRow,
  type SeriesMonthRow,
  seriesPath,
  WORLD_AREA,
} from "@/pipeline/series-row";
import type { AreaOption, YearRange } from "./calendar-filters";
import {
  buildCalendarYears,
  type CalendarPasses,
  type CalendarSource,
  type CalendarYear,
  hasHarmonizedValues,
} from "./calendar-matrix";
import { analyzeCalendar, type CalendarAnalysis } from "./calendar-statistics";
import {
  closedMonthComparison,
  currentMonthComparison,
  type MonthComparison,
} from "./month-comparison";

export const DEFAULT_AREA = "BOL";

const COVERAGE_PATH = "meta/coverage.csv";
const COUNTRIES_PATH = "meta/countries.csv";
const ALL_MONTHS: boolean[] = Array(12).fill(true);

export type AreaCalendar = {
  area: string;
  areaName: string;
  areaOptions: AreaOption[];
  countries: CountryRow[] | null;
  coverage: PipelineCoverage | null;
  lastDataDate: string | null;
  dailyRows: SeriesDayRow[] | null;
  updatedAt: string | null;
  source: CalendarSource;
  sourceChosen: boolean;
  setSource: (source: CalendarSource | null) => void;
  passes: CalendarPasses;
  setPasses: (passes: CalendarPasses) => void;
  yearRange: YearRange;
  setYearRange: (range: YearRange | null) => void;
  enabledMonths: boolean[];
  toggleMonth: (index: number) => void;
  clearFilters: () => void;
  years: CalendarYear[];
  visibleYears: CalendarYear[];
  analysis: CalendarAnalysis;
  closedMonth: MonthComparison | null;
  currentMonth: MonthComparison | null;
  failedPaths: string[];
  ready: boolean;
};

function failed(paths: [string, PipelineFile<unknown>][]): string[] {
  return paths
    .filter(([, file]) => file.error && !file.rows)
    .map(([path]) => path);
}

export function useAreaCalendar(requestedArea: string | null): AreaCalendar {
  const latest = useBatchPolling();
  const coverageFile = usePipelineFile<CoverageRow>(COVERAGE_PATH);
  const countriesFile = usePipelineFile<CountryRow>(COUNTRIES_PATH);
  const countries = countriesFile.rows;
  const wanted = requestedArea ?? DEFAULT_AREA;
  const area =
    wanted === WORLD_AREA ||
    !countries ||
    countries.some((country) => country.iso3 === wanted)
      ? wanted
      : DEFAULT_AREA;
  const monthlyPath = seriesPath("monthly", area);
  const monthlyFile = usePipelineFile<SeriesMonthRow>(monthlyPath);
  const dailyFile = usePipelineFile<SeriesDayRow>(seriesPath("daily", area));

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
  const firstYear = Math.max(chosenRange?.first ?? 0, years[0]?.year ?? 0);
  const lastYear = Math.min(
    chosenRange?.last ?? Infinity,
    years.at(-1)?.year ?? 0,
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
  const completeDate = coverage?.completeDate ?? null;
  const closedMonth = useMemo(
    () => closedMonthComparison(years, analysis),
    [years, analysis],
  );
  const currentMonth = useMemo(
    () =>
      dailyFile.rows && completeDate
        ? currentMonthComparison(
            dailyFile.rows,
            years,
            analysis,
            source,
            passes,
            completeDate,
          )
        : null,
    [dailyFile.rows, years, analysis, source, passes, completeDate],
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

  return {
    area,
    areaName: areaOptions.find((option) => option.value === area)?.label ?? "",
    areaOptions,
    countries,
    coverage,
    lastDataDate,
    dailyRows: dailyFile.rows,
    updatedAt: latest.rows?.[0]?.updated_at ?? null,
    source,
    sourceChosen: chosenSource !== null,
    setSource: setChosenSource,
    passes,
    setPasses,
    yearRange: { first: firstYear, last: lastYear },
    setYearRange: setChosenRange,
    enabledMonths,
    toggleMonth: (index) =>
      setEnabledMonths(enabledMonths.map((on, i) => (i === index ? !on : on))),
    clearFilters: () => {
      setChosenSource(null);
      setPasses("all");
      setChosenRange(null);
      setEnabledMonths(ALL_MONTHS);
    },
    years,
    visibleYears,
    analysis,
    closedMonth,
    currentMonth,
    failedPaths: failed([
      [COVERAGE_PATH, coverageFile],
      [monthlyPath, monthlyFile],
    ]),
    ready: years.length > 0 && lastDataDate !== null,
  };
}
