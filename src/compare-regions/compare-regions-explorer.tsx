"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { areaMapHref } from "@/area-filters/area-links";
import {
  formatArea,
  useCountryOutlines,
} from "@/country-outlines/country-outlines";
import { HEAT_BACKGROUNDS } from "@/fire-calendar/calendar-cell-style";
import {
  formatCount,
  heatRangeLabel,
  MONTH_ABBREVIATIONS,
  MONTH_NAMES,
} from "@/fire-calendar/calendar-labels";
import {
  buildCalendarYears,
  CALENDAR_FIRST_YEAR,
  lastDayOfMonth,
} from "@/fire-calendar/calendar-matrix";
import { DeltaBadge } from "@/fire-calendar/calendar-reports";
import {
  analyzeCalendar,
  heatLevel,
  isMeasured,
  logBreaks,
} from "@/fire-calendar/calendar-statistics";
import { periodComparison } from "@/fire-calendar/month-comparison";
import { SegmentedChoice } from "@/fire-calendar/segmented-choice";
import { MaterialSymbol } from "@/icons/material-symbols";
import { type CountryRow, countryName } from "@/pipeline/pipeline-countries";
import { type CoverageRow, readCoverage } from "@/pipeline/pipeline-coverage";
import { usePipelineFile, usePipelineFiles } from "@/pipeline/pipeline-files";
import {
  type SeriesDayRow,
  type SeriesMonthRow,
  type SeriesYearRow,
  seriesPath,
} from "@/pipeline/series-row";

const FireMap = dynamic(
  () => import("@/fire-map/fire-map").then((module) => module.FireMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] animate-pulse rounded-lg border border-line bg-surface" />
    ),
  },
);

type Measure = "total" | "area";
type PeriodChoice = "year" | "season" | "previous";
type DateRange = { start: string; end: string };

const MAX_COUNTRIES = 4;
const PER_AREA = 1000;
const ALL_MONTHS = Array(12).fill(true);
const COUNT_WORDS = [
  "Nenhum país",
  "Um país",
  "Dois países",
  "Três países",
  "Quatro países",
];
const MEASURES: { value: Measure; label: string }[] = [
  { value: "total", label: "Total de focos" },
  { value: "area", label: "Por 1.000 km²" },
];
const DENSITY = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const NO_FIRES: never[] = [];

function seasonRange(
  year: number,
  months: number[],
  completeDate: string,
): DateRange | null {
  for (let candidate = year; candidate >= CALENDAR_FIRST_YEAR; candidate--) {
    const first = months[0];
    const last = months.at(-1)!;
    const start = `${candidate}-${String(first + 1).padStart(2, "0")}-01`;
    const end = lastDayOfMonth(
      `${last < first ? candidate + 1 : candidate}-${String(last + 1).padStart(2, "0")}`,
    );
    if (start <= completeDate) {
      return { start, end: end < completeDate ? end : completeDate };
    }
  }
  return null;
}

function measured(
  value: number | null,
  area: number | null | undefined,
  measure: Measure,
): number | null {
  if (value === null) {
    return null;
  }
  if (measure === "total") {
    return value;
  }
  return area ? (value / area) * PER_AREA : null;
}

function formatMeasure(value: number, measure: Measure): string {
  return measure === "total" ? formatCount(value) : DENSITY.format(value);
}

export function CompareRegionsExplorer() {
  const searchParams = useSearchParams();
  const outlines = useCountryOutlines();
  const countries = usePipelineFile<CountryRow>("meta/countries.csv").rows;
  const coverageRows = usePipelineFile<CoverageRow>("meta/coverage.csv").rows;
  const yearly = usePipelineFile<SeriesYearRow & { iso3: string }>(
    "series/countries_yearly.csv",
  ).rows;
  const coverage = useMemo(
    () => (coverageRows ? readCoverage(coverageRows) : null),
    [coverageRows],
  );
  const completeDate = coverage?.completeDate ?? null;
  const lastYear = completeDate ? Number(completeDate.slice(0, 4)) : null;
  const requestedYear = Number(searchParams.get("year")) || null;
  const year =
    lastYear === null
      ? null
      : requestedYear &&
          requestedYear >= CALENDAR_FIRST_YEAR &&
          requestedYear <= lastYear
        ? requestedYear
        : lastYear;
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [periodChoice, setPeriodChoice] = useState<PeriodChoice>("year");
  const [measure, setMeasure] = useState<Measure>("area");

  const requested = useMemo(
    () =>
      (searchParams.get("areas") ?? searchParams.get("area") ?? "")
        .split(",")
        .filter((code) => /^[A-Z]{3}$/.test(code)),
    [searchParams],
  );
  const defaults = useMemo(() => {
    if (!countries) {
      return requested;
    }
    const known = requested.filter((code) =>
      countries.some((country) => country.iso3 === code),
    );
    if (known.length >= 2 || !yearly || year === null) {
      return known.slice(0, MAX_COUNTRIES);
    }
    const first = countries.find((country) => country.iso3 === known[0]);
    const totals = new Map(
      yearly
        .filter((row) => row.year === year)
        .map((row) => [row.iso3, row.harmonized ?? 0]),
    );
    const neighbours = countries
      .filter(
        (country) =>
          country.iso3 !== first?.iso3 &&
          (!first || country.continent === first.continent),
      )
      .sort((a, b) => (totals.get(b.iso3) ?? 0) - (totals.get(a.iso3) ?? 0))
      .slice(0, 3 - known.length)
      .map((country) => country.iso3);
    return [...known, ...neighbours];
  }, [countries, requested, yearly, year]);
  const selected = chosen ?? defaults;

  const monthlyFiles = usePipelineFiles<SeriesMonthRow>(
    selected.map((code) => seriesPath("monthly", code)),
  );
  const dailyFiles = usePipelineFiles<SeriesDayRow>(
    selected.map((code) => seriesPath("daily", code)),
  );

  const regions = useMemo(() => {
    if (!coverage || !completeDate || year === null || !countries) {
      return null;
    }
    return selected.map((code, index) => {
      const country = countries.find((candidate) => candidate.iso3 === code);
      const monthly = monthlyFiles[index]?.rows;
      const daily = dailyFiles[index]?.rows;
      const years = monthly
        ? buildCalendarYears(monthly, coverage, "harmonized", "all")
        : [];
      const analysis = analyzeCalendar(years, years, ALL_MONTHS);
      return {
        code,
        name: country ? countryName(country) : code,
        area: country?.area_km2 ?? null,
        years,
        analysis,
        daily,
        loading: !monthly || !daily,
      };
    });
  }, [
    selected,
    monthlyFiles,
    dailyFiles,
    coverage,
    completeDate,
    year,
    countries,
  ]);

  if (!regions || year === null || !completeDate || !countries) {
    return (
      <main className="mx-auto max-w-[1328px] px-4 pt-8 pb-24 sm:px-8 lg:px-16">
        <div className="h-[420px] animate-pulse rounded-lg border border-line bg-surface" />
      </main>
    );
  }

  const seasonMonths = regions[0]?.analysis.season?.months;
  const seasonOfFirst = seasonMonths
    ? seasonRange(year, seasonMonths, completeDate)
    : null;
  const periods: {
    value: PeriodChoice;
    label: string;
    range: DateRange | null;
  }[] = [
    {
      value: "year",
      label: year === lastYear ? `${year} até agora` : String(year),
      range: {
        start: `${year}-01-01`,
        end: year === lastYear ? completeDate : `${year}-12-31`,
      },
    },
    {
      value: "season",
      label: `Temporada crítica ${seasonOfFirst?.start.slice(0, 4) ?? year}`,
      range: seasonOfFirst,
    },
    {
      value: "previous",
      label: String(year - 1),
      range: { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` },
    },
  ];
  const period =
    periods.find((option) => option.value === periodChoice && option.range) ??
    periods[0];
  const range = period.range!;

  const results = regions.map((region) => {
    const comparison =
      region.daily && region.years.length
        ? periodComparison(
            region.daily,
            region.years,
            region.analysis,
            "harmonized",
            "all",
            range,
            completeDate,
          )
        : null;
    return {
      ...region,
      value: comparison?.value ?? null,
      typical: comparison?.typical ?? null,
      shown: measured(comparison?.value ?? null, region.area, measure),
    };
  });
  const ranked = [...results].sort((a, b) => (b.shown ?? -1) - (a.shown ?? -1));
  const withValues = results.filter(
    (result) => result.value !== null && result.area,
  );
  const leaderByTotal = [...withValues].sort((a, b) => b.value! - a.value!)[0];
  const leaderByArea = [...withValues].sort(
    (a, b) => b.value! / b.area! - a.value! / a.area!,
  )[0];
  const insight =
    withValues.length < 2
      ? null
      : leaderByTotal.code === leaderByArea.code
        ? `${leaderByTotal.name} lidera nas duas medidas: no total de focos e por área.`
        : `Por área, ${leaderByArea.name} teve ${DENSITY.format(
            leaderByArea.value! /
              leaderByArea.area! /
              (leaderByTotal.value! / leaderByTotal.area!),
          )}× mais focos que ${leaderByTotal.name}. Em números absolutos, ${leaderByTotal.name} lidera.`;

  const monthRows = results.map((result) => {
    const yearCells = result.years.find((item) => item.year === year)?.cells;
    return {
      ...result,
      months: Array.from({ length: 12 }, (_, month) => {
        const cell = yearCells?.[month];
        return {
          cell,
          value:
            cell && isMeasured(cell)
              ? measured(cell.value, result.area, measure)
              : null,
        };
      }),
    };
  });
  const breaks = logBreaks(
    monthRows.flatMap((row) =>
      row.months.flatMap((month) =>
        month.value && month.value > 0 ? [month.value] : [],
      ),
    ),
  );
  const outlinesOf = selected.flatMap((code) =>
    outlines?.[code] ? [outlines[code].bounds] : [],
  );
  const bounds: [number, number, number, number] | null = outlinesOf.length
    ? [
        Math.min(...outlinesOf.map((box) => box[0])),
        Math.min(...outlinesOf.map((box) => box[1])),
        Math.max(...outlinesOf.map((box) => box[2])),
        Math.max(...outlinesOf.map((box) => box[3])),
      ]
    : null;
  const addable = countries
    .filter((country) => !selected.includes(country.iso3))
    .map((country) => ({ value: country.iso3, label: countryName(country) }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  const unitLabel =
    measure === "total" ? "focos equivalentes VIIRS" : "focos por 1.000 km²";

  return (
    <main className="mx-auto max-w-[1328px] px-4 pt-8 pb-24 sm:px-8 lg:px-16 lg:pt-12">
      <Link
        href={areaMapHref(selected[0] ?? "world", year)}
        className="type-button inline-flex items-center gap-1.5 text-ink hover:underline"
      >
        <MaterialSymbol name="arrow_back" className="size-[18px]" />
        Voltar ao mapa
      </Link>
      <header className="mt-6 flex flex-col gap-2">
        <p className="type-eyebrow text-ink-muted">Comparar regiões</p>
        <h1 className="type-heading-lg text-ink">
          {COUNT_WORDS[selected.length]} na mesma escala
        </h1>
        <p className="type-body max-w-[720px] text-ink-muted">
          Compare até {MAX_COUNTRIES} países no mesmo período. Medir por área
          deixa países de tamanhos diferentes comparáveis.
        </p>
      </header>

      <section
        aria-label="Opções da comparação"
        className="mt-8 flex flex-col gap-6 rounded-md border border-line bg-surface p-4 sm:p-6"
      >
        <div className="flex flex-col gap-2">
          <span className="type-caption text-ink-muted">Países</span>
          <div className="flex flex-wrap items-center gap-2">
            {selected.map((code) => {
              const name = results.find((result) => result.code === code)?.name;
              return (
                <span
                  key={code}
                  className="type-chip inline-flex h-9 items-center gap-1 rounded-full border border-line-strong bg-surface-raised pr-1 pl-4 text-ink"
                >
                  {name}
                  <button
                    type="button"
                    aria-label={`Remover ${name}`}
                    onClick={() =>
                      setChosen(selected.filter((other) => other !== code))
                    }
                    className="flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-surface-hover"
                  >
                    <MaterialSymbol name="close" className="size-4" />
                  </button>
                </span>
              );
            })}
            {selected.length < MAX_COUNTRIES && (
              <label className="relative inline-flex items-center">
                <span className="sr-only">Adicionar país</span>
                <MaterialSymbol
                  name="add"
                  className="pointer-events-none absolute left-2.5 size-[18px]"
                />
                <select
                  value=""
                  onChange={(event) =>
                    event.target.value &&
                    setChosen([...selected, event.target.value])
                  }
                  className="type-chip h-9 w-52 cursor-pointer appearance-none rounded-full border border-dashed border-line-strong bg-surface pr-4 pl-8 text-ink hover:bg-surface-hover"
                >
                  <option value="">Adicionar país</option>
                  {addable.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span className="type-body-sm text-ink-muted">
              até {MAX_COUNTRIES}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="flex flex-col gap-2">
            <span className="type-caption text-ink-muted">Período</span>
            <div
              role="radiogroup"
              aria-label="Período"
              className="flex flex-wrap gap-2"
            >
              {periods.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={option.value === period.value}
                  disabled={!option.range}
                  onClick={() => setPeriodChoice(option.value)}
                  className={`type-chip h-9 cursor-pointer rounded-full border px-4 transition-colors duration-200 ease-standard disabled:cursor-not-allowed disabled:opacity-40 ${option.value === period.value ? "border-selected bg-selected font-semibold text-ink-inverse" : "border-line bg-surface text-ink enabled:hover:border-ink enabled:hover:bg-surface-hover"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="type-caption text-ink-muted">Medida</span>
            <SegmentedChoice
              label="Medida"
              options={MEASURES}
              value={measure}
              onChange={setMeasure}
            />
          </div>
        </div>
      </section>

      <section
        aria-label="Países comparados"
        className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      >
        <FireMap
          label={`Mapa com ${results.map((result) => result.name).join(", ")}`}
          area={null}
          areas={selected}
          bounds={bounds}
          points={NO_FIRES}
          cells={NO_FIRES}
          cellBreaks={NO_FIRES}
          renderTooltip={() => null}
        >
          <p className="type-caption pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-2 rounded-sm bg-surface-raised/90 px-3 py-2 text-ink">
            <span
              aria-hidden="true"
              className="size-3 rounded-xs border border-region-line bg-region-fill"
            />
            País comparado
          </p>
        </FireMap>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="type-heading-md text-ink">
              {measure === "total" ? "Total de focos" : "Focos por 1.000 km²"}
            </h2>
            <p className="type-body-sm text-ink-muted">
              {period.label} · equivalente VIIRS · só dias completos
            </p>
          </div>
          {insight && (
            <p className="type-body-sm flex items-start gap-2 rounded-md bg-surface-hover px-4 py-3 text-ink">
              <MaterialSymbol name="info" className="mt-0.5 size-4 shrink-0" />
              {insight}
            </p>
          )}
          <ol className="flex flex-col gap-3">
            {ranked.map((result) => (
              <li
                key={result.code}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-4"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="type-heading-sm text-ink">
                    {result.name}
                  </span>
                  <span className="type-body-sm text-ink-muted tabular-nums">
                    {result.value === null
                      ? result.loading
                        ? "Carregando"
                        : "Sem dados completos"
                      : `${formatCount(result.value)} focos`}
                    {result.area ? ` · ${formatArea(result.area)}` : ""}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="type-data text-xl text-ink">
                    {result.shown === null
                      ? "-"
                      : formatMeasure(result.shown, measure)}
                  </span>
                  {result.value !== null && result.typical ? (
                    <DeltaBadge value={result.value} typical={result.typical} />
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
          <p className="type-body-sm text-ink-muted">
            O típico de cada país é a mediana dos mesmos dias de{" "}
            {CALENDAR_FIRST_YEAR} até o último ano completo.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="months-title"
        className="mt-10 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 id="months-title" className="type-heading-md text-ink">
            Mês a mês em {year}
          </h2>
          <p className="type-body-sm text-ink-muted">
            {unitLabel[0].toUpperCase() + unitLabel.slice(1)} · mesma escala
            para todos os países
          </p>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-1">
            <thead>
              <tr>
                <th scope="col" className="sr-only">
                  País
                </th>
                {MONTH_ABBREVIATIONS.map((month) => (
                  <th
                    key={month}
                    scope="col"
                    className="type-caption font-normal text-ink-muted"
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthRows.map((row) => (
                <tr key={row.code}>
                  <th
                    scope="row"
                    className="type-body-sm pr-3 text-left font-normal whitespace-nowrap text-ink"
                  >
                    {row.name}
                  </th>
                  {row.months.map(({ cell, value }, month) => {
                    const label = `${MONTH_NAMES[month]} de ${year}: ${
                      value === null
                        ? cell?.state === "future"
                          ? "sem dados ainda"
                          : "sem dado"
                        : `${formatMeasure(value, measure)} ${unitLabel}`
                    }${cell?.partial ? ", parcial" : ""}`;
                    return (
                      <td key={month} className="p-0">
                        <span
                          role="img"
                          aria-label={label}
                          title={label}
                          className={`block h-9 rounded-xs ${
                            value === null
                              ? "border border-dashed border-line"
                              : value === 0
                                ? "border border-line bg-heat-0"
                                : HEAT_BACKGROUNDS[heatLevel(value, breaks) - 1]
                          } ${cell?.partial ? "opacity-60" : ""}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="grid max-w-xl grid-cols-6 gap-1">
            {HEAT_BACKGROUNDS.map((className, index) => (
              <span key={className} className="flex min-w-0 flex-col gap-1">
                <span className={`block h-2 rounded-xs ${className}`} />
                <span className="truncate text-[10px] leading-3 text-ink-muted tabular-nums">
                  {breaks.length === 0
                    ? "> 0"
                    : heatRangeLabel(
                        index === 0 ? null : breaks[index - 1],
                        index === HEAT_BACKGROUNDS.length - 1
                          ? null
                          : breaks[index],
                      )}
                </span>
              </span>
            ))}
          </span>
          <span className="type-body-sm text-ink-muted">
            Meses mais claros: o mês corrente, ainda parcial. Contorno
            tracejado: sem dados ainda.
          </span>
        </div>
      </section>
    </main>
  );
}
