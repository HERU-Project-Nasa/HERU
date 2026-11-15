"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { areaMapHref } from "@/area-filters/area-links";
import { buttonClassName } from "@/button/button-class-name";
import { useCountryOutlines } from "@/country-outlines/country-outlines";
import { HEAT_BACKGROUNDS } from "@/fire-calendar/calendar-cell-style";
import {
  difference,
  formatCompact,
  formatCount,
  formatHotspots,
  heatRangeLabel,
  MONTH_NAMES,
  SOURCE_SHORT_UNITS,
  yearsLabel,
} from "@/fire-calendar/calendar-labels";
import {
  CALENDAR_FIRST_YEAR,
  lastDayOfMonth,
} from "@/fire-calendar/calendar-matrix";
import { DeltaBadge, TrendBadge } from "@/fire-calendar/calendar-reports";
import { logBreaks } from "@/fire-calendar/calendar-statistics";
import {
  datesBetween,
  dayValues,
  periodComparison,
  type PeriodComparison,
  shiftYears,
} from "@/fire-calendar/month-comparison";
import { useAreaCalendar } from "@/fire-calendar/use-area-calendar";
import type { MapTooltip } from "@/fire-map/fire-map";
import {
  addDays,
  dateRangeLabel,
  layerForMonth,
  type MapPeriod,
  periodDates,
  periodMonths,
  usesPoints,
} from "@/fire-map/map-period";
import type { CellColumn, FireCell } from "@/fire-map/period-fires";
import { SENSOR_NAMES } from "@/fire-map/sensor-picker";
import { type MapFires, useMapFires } from "@/fire-map/use-map-fires";
import { MaterialSymbol } from "@/icons/material-symbols";
import type { PipelineCoverage } from "@/pipeline/pipeline-coverage";
import {
  type HarmonizedSource,
  type SeriesDayRow,
  type SeriesLayer,
  WORLD_AREA,
} from "@/pipeline/series-row";

const FireMap = dynamic(
  () => import("@/fire-map/fire-map").then((module) => module.FireMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] animate-pulse rounded-lg border border-line bg-surface sm:h-[600px]" />
    ),
  },
);

type DateRange = { start: string; end: string };

const LAST_DAYS = 90;
const WEEK = 7;
const HARMONIZED_LAYERS: Partial<Record<HarmonizedSource, SeriesLayer>> = {
  modis_x_k: "modis",
  viirs_snpp: "viirs_snpp",
  viirs_noaa20_x_k20: "viirs_noaa20",
};
const NO_CELLS: FireCell[] = [];
const DATE_INPUT =
  "type-chip h-10 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-3 text-ink [color-scheme:dark] disabled:opacity-60";
const UTC_TIME = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "UTC",
});

function toMapPeriod(range: DateRange): MapPeriod {
  return { ...range, hours: null, preset: null, seasonKey: null };
}

function shiftDate(date: string, years: number): string {
  return shiftYears(date, years) ?? `${Number(date.slice(0, 4)) + years}-02-28`;
}

function dayCount(range: DateRange): number {
  return datesBetween(range.start, range.end).length;
}

function seasonRange(year: number, months: number[]): DateRange {
  const first = months[0];
  const last = months.at(-1)!;
  const endYear = last < first ? year + 1 : year;
  return {
    start: `${year}-${String(first + 1).padStart(2, "0")}-01`,
    end: lastDayOfMonth(`${endYear}-${String(last + 1).padStart(2, "0")}`),
  };
}

function latestSeason(
  months: number[],
  completeDate: string,
  wantedYear: number | null,
): { year: number; range: DateRange } | null {
  const lastYear = Number(completeDate.slice(0, 4));
  for (
    let year = Math.min(wantedYear ?? lastYear, lastYear);
    year >= CALENDAR_FIRST_YEAR;
    year--
  ) {
    const range = seasonRange(year, months);
    if (range.start <= completeDate) {
      return {
        year,
        range: {
          start: range.start,
          end: range.end < completeDate ? range.end : completeDate,
        },
      };
    }
  }
  return null;
}

function sumOf(values: (number | null)[]): number | null {
  return values.every((value) => value !== null)
    ? values.reduce<number>((total, value) => total + value!, 0)
    : null;
}

function changeText(value: number, reference: number) {
  if (reference === 0) {
    return {
      text: value === 0 ? "igual" : "sem base",
      direction: "equal" as const,
    };
  }
  const percent = Math.round(((value - reference) / reference) * 100);
  return percent === 0
    ? { text: "igual", direction: "equal" as const }
    : {
        text: `${Math.abs(percent)}% ${percent > 0 ? "a mais" : "a menos"}`,
        direction: percent > 0 ? ("above" as const) : ("below" as const),
      };
}

function useRangeFires(
  range: DateRange,
  area: string | null,
  bounds: [number, number, number, number] | null,
  coverage: PipelineCoverage | null,
  rowsByDate: Map<string, SeriesDayRow>,
  harmonized: boolean,
): MapFires {
  const period = useMemo(() => toMapPeriod(range), [range]);
  const pointLayers = useMemo(
    () =>
      coverage
        ? periodDates(period).map(
            (date) =>
              HARMONIZED_LAYERS[
                rowsByDate.get(date)?.harmonized_source ?? ""
              ] ?? layerForMonth(date.slice(0, 7), coverage),
          )
        : [],
    [period, rowsByDate, coverage],
  );
  const cellColumns = useMemo(
    () =>
      coverage
        ? periodMonths(period).map((month): CellColumn =>
            harmonized ? "harmonized" : layerForMonth(month, coverage),
          )
        : [],
    [period, coverage, harmonized],
  );
  return useMapFires(
    period,
    area,
    bounds,
    coverage,
    coverage ? usesPoints(period, area === null) : false,
    0,
    pointLayers,
    cellColumns,
    null,
    "",
    null,
  );
}

function CompareTooltip({
  tooltip,
  harmonized,
}: {
  tooltip: MapTooltip;
  harmonized: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-line bg-surface-raised p-3 shadow-overlay">
      {tooltip.kind === "cell" ? (
        <>
          <p className="type-caption pr-8 text-ink-muted">
            Célula de 0,25° · cerca de 28 km
          </p>
          <p className="type-heading-sm text-ink">
            {formatHotspots(tooltip.cell.count)}
            {harmonized && " equivalentes VIIRS"}
          </p>
        </>
      ) : (
        <>
          <p className="type-caption pr-8 text-ink-muted">Foco de calor</p>
          <p className="type-body-sm text-ink">
            {SENSOR_NAMES[tooltip.point.layer]} ·{" "}
            {UTC_TIME.format(new Date(tooltip.point.acquiredAt))} UTC
          </p>
        </>
      )}
    </div>
  );
}

function RangeInputs({
  letter,
  range,
  min,
  max,
  lockedEnd,
  onChange,
  shortcuts,
}: {
  letter: string;
  range: DateRange;
  min: string;
  max: string;
  lockedEnd: boolean;
  onChange: (range: DateRange) => void;
  shortcuts: { label: string; range: DateRange }[];
}) {
  return (
    <fieldset className="flex min-w-0 flex-1 flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <legend className="type-caption flex items-center gap-2 px-1 text-ink-muted">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-ink-inverse">
          {letter}
        </span>
        Período {letter}
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="type-caption text-ink-muted">De</span>
          <input
            type="date"
            value={range.start}
            min={min}
            max={lockedEnd ? max : range.end}
            onChange={(event) => {
              const start = event.target.value;
              if (!start) {
                return;
              }
              onChange(
                lockedEnd
                  ? {
                      start,
                      end: addDays(start, dayCount(range) - 1),
                    }
                  : { start, end: range.end < start ? start : range.end },
              );
            }}
            className={DATE_INPUT}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="type-caption text-ink-muted">Até</span>
          <input
            type="date"
            value={range.end}
            min={range.start}
            max={max}
            disabled={lockedEnd}
            onChange={(event) =>
              event.target.value &&
              onChange({ start: range.start, end: event.target.value })
            }
            className={DATE_INPUT}
          />
        </label>
      </div>
      {lockedEnd && (
        <p className="type-body-sm text-ink-muted">
          O fim acompanha a duração do período A.
        </p>
      )}
      <div
        aria-label={`Atalhos do período ${letter}`}
        className="flex flex-wrap gap-2"
      >
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            onClick={() => onChange(shortcut.range)}
            className="type-chip h-8 cursor-pointer rounded-full border border-line bg-surface px-3 text-ink transition-colors duration-120 ease-standard hover:border-ink hover:bg-surface-hover"
          >
            {shortcut.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function PeriodMap({
  letter,
  range,
  fires,
  breaks,
  area,
  bounds,
  areaName,
  harmonized,
}: {
  letter: string;
  range: DateRange;
  fires: MapFires;
  breaks: number[];
  area: string | null;
  bounds: [number, number, number, number] | null;
  areaName: string;
  harmonized: boolean;
}) {
  const ready = fires.status === "ready" ? fires : null;
  const cells = ready?.mode === "cells" ? ready.cells : NO_CELLS;
  const points = ready?.mode === "points" ? ready.points : [];
  const days = dayCount(range);
  const status =
    fires.status === "loading"
      ? "Carregando os focos do período."
      : fires.status === "error"
        ? "Não conseguimos carregar os focos agora."
        : ready?.mode === "points" && ready.missingDays === ready.totalDays
          ? "Os pontos diários deste período não estão publicados."
          : cells.length === 0 && points.length === 0
            ? "Nenhum foco de calor neste período."
            : null;
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-ink text-sm font-semibold text-ink-inverse">
          {letter}
        </span>
        <span className="type-heading-sm text-ink">
          {dateRangeLabel(range.start, range.end)}
        </span>
        <span className="type-body-sm text-ink-muted">
          · {days} {days === 1 ? "dia" : "dias"}
        </span>
      </figcaption>
      <FireMap
        label={`Mapa de focos de ${areaName}, período ${letter}, ${dateRangeLabel(range.start, range.end)}`}
        area={area}
        bounds={bounds}
        points={points}
        cells={cells}
        cellBreaks={breaks}
        renderTooltip={(tooltip) => (
          <CompareTooltip tooltip={tooltip} harmonized={harmonized} />
        )}
      >
        {status && (
          <p
            role="status"
            className="type-body-sm pointer-events-none absolute top-4 left-4 z-10 flex max-w-[calc(100%-6rem)] items-start gap-2 rounded-sm bg-surface-raised/90 px-3 py-2 text-ink"
          >
            <MaterialSymbol
              name={fires.status === "loading" ? "progress_activity" : "info"}
              className={`mt-0.5 size-4 shrink-0 ${fires.status === "loading" ? "animate-spin" : ""}`}
            />
            {status}
          </p>
        )}
      </FireMap>
    </figure>
  );
}

function SummaryCard({
  eyebrow,
  children,
}: {
  eyebrow: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-md border border-line bg-surface p-6">
      <p className="type-eyebrow text-ink-muted">{eyebrow}</p>
      {children}
    </article>
  );
}

function WeekChart({
  weeksA,
  weeksB,
  labelA,
  labelB,
}: {
  weeksA: (number | null)[];
  weeksB: (number | null)[];
  labelA: string;
  labelB: string;
}) {
  const values = [...weeksA, ...weeksB].flatMap((value) =>
    value === null ? [] : [value],
  );
  const top = Math.max(1, ...values) * 1.1;
  const left = 56;
  const right = 820;
  const bottom = 210;
  const topY = 20;
  const x = (index: number) =>
    left + (index / Math.max(1, weeksA.length - 1)) * (right - left);
  const y = (value: number) => bottom - (value / top) * (bottom - topY);
  const line = (weeks: (number | null)[]) =>
    weeks
      .flatMap((value, index) =>
        value === null ? [] : [`${x(index).toFixed(1)},${y(value).toFixed(1)}`],
      )
      .join(" ");
  return (
    <figure className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="type-heading-sm text-ink">Semana a semana</span>
        <span className="type-body-sm flex flex-wrap gap-x-5 gap-y-1 text-ink">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="w-6 border-t-2 border-ink" />
            {labelA}
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-6 border-t-2 border-dashed border-delta-below"
            />
            {labelB}
          </span>
        </span>
      </figcaption>
      <div className="relative overflow-x-auto">
        <svg
          viewBox="0 0 840 240"
          role="img"
          aria-label={`Focos por semana: ${labelA} contra ${labelB}.`}
          className="block w-full min-w-[560px] font-ui"
        >
          {[0, 0.5, 1].map((share) => (
            <g key={share}>
              <line
                x1={left}
                x2={right}
                y1={y(top * share)}
                y2={y(top * share)}
                className="stroke-line"
              />
              <text
                x={left - 8}
                y={y(top * share) + 4}
                fontSize="12"
                textAnchor="end"
                className="fill-ink-muted"
              >
                {formatCompact(top * share)}
              </text>
            </g>
          ))}
          {weeksA.map((_, index) => (
            <text
              key={index}
              x={x(index)}
              y={bottom + 22}
              fontSize="11"
              textAnchor="middle"
              className="fill-ink-muted"
            >
              {weeksA.length > 16 && index % 2 === 1 ? "" : `${index + 1}`}
            </text>
          ))}
          <polyline
            points={line(weeksB)}
            fill="none"
            strokeWidth={2}
            strokeDasharray="6 5"
            className="stroke-delta-below"
          />
          <polyline
            points={line(weeksA)}
            fill="none"
            strokeWidth={2.5}
            className="stroke-ink"
          />
        </svg>
      </div>
      <p className="type-body-sm text-ink-muted">
        Cada ponto soma 7 dias a partir do início de cada período; o eixo de
        baixo conta as semanas.
      </p>
    </figure>
  );
}

export function CompareDatesExplorer() {
  const searchParams = useSearchParams();
  const calendar = useAreaCalendar(searchParams.get("area"));
  const outlines = useCountryOutlines();
  const {
    area,
    areaName,
    coverage,
    years,
    analysis,
    dailyRows,
    source,
    passes,
    ready,
  } = calendar;
  const world = area === WORLD_AREA;
  const completeDate = coverage?.completeDate ?? null;
  const requestedYear = Number(searchParams.get("year")) || null;
  const [chosenA, setChosenA] = useState<DateRange | null>(null);
  const [chosenBStart, setChosenBStart] = useState<string | null>(null);

  const seasonMonths = analysis.season?.months;
  const seasonShortcut = useMemo(
    () =>
      seasonMonths && completeDate
        ? latestSeason(seasonMonths, completeDate, requestedYear)
        : null,
    [seasonMonths, completeDate, requestedYear],
  );

  const lastDaysRange = useMemo(
    () =>
      completeDate
        ? { start: addDays(completeDate, 1 - LAST_DAYS), end: completeDate }
        : null,
    [completeDate],
  );
  const rangeA = chosenA ?? seasonShortcut?.range ?? lastDaysRange;
  const length = rangeA ? dayCount(rangeA) : 0;
  const rangeB = useMemo(() => {
    if (!rangeA) {
      return null;
    }
    const start = chosenBStart ?? shiftDate(rangeA.start, -1);
    return { start, end: addDays(start, length - 1) };
  }, [rangeA, chosenBStart, length]);

  const rowsByDate = useMemo(
    () => new Map((dailyRows ?? []).map((row) => [row.date, row])),
    [dailyRows],
  );
  const outline = world ? null : (outlines?.[area] ?? null);
  const bounds = outline?.bounds ?? null;
  const harmonized = source === "harmonized";
  const firesA = useRangeFires(
    rangeA ?? { start: "", end: "" },
    world ? null : area,
    bounds,
    rangeA ? coverage : null,
    rowsByDate,
    harmonized,
  );
  const firesB = useRangeFires(
    rangeB ?? { start: "", end: "" },
    world ? null : area,
    bounds,
    rangeB ? coverage : null,
    rowsByDate,
    harmonized,
  );
  const breaks = useMemo(
    () =>
      logBreaks(
        [firesA, firesB].flatMap((fires) =>
          fires.status === "ready" && fires.mode === "cells"
            ? fires.cells.map((cell) => cell.count)
            : [],
        ),
      ),
    [firesA, firesB],
  );

  const comparisons = useMemo(() => {
    if (!ready || !dailyRows || !completeDate || !rangeA || !rangeB) {
      return null;
    }
    const compare = (range: DateRange): PeriodComparison | null =>
      periodComparison(
        dailyRows,
        years,
        analysis,
        source,
        passes,
        range,
        completeDate,
      );
    const valuesOf = (range: DateRange) =>
      dayValues(
        dailyRows,
        years,
        source,
        passes,
        datesBetween(range.start, range.end),
      );
    return {
      a: compare(rangeA),
      b: compare(rangeB),
      daysA: valuesOf(rangeA),
      daysB: valuesOf(rangeB),
    };
  }, [
    ready,
    dailyRows,
    completeDate,
    rangeA,
    rangeB,
    years,
    analysis,
    source,
    passes,
  ]);

  if (!ready || !rangeA || !rangeB || !completeDate) {
    return (
      <main className="mx-auto max-w-[1328px] px-4 pt-8 pb-24 sm:px-8 lg:px-16">
        <div className="h-[420px] animate-pulse rounded-lg border border-line bg-surface" />
      </main>
    );
  }

  const yearA = Number(rangeA.start.slice(0, 4));
  const yearB = Number(rangeB.start.slice(0, 4));
  const labelA = `A · ${dateRangeLabel(rangeA.start, rangeA.end)}`;
  const labelB = `B · ${dateRangeLabel(rangeB.start, rangeB.end)}`;
  const record = analysis.record;
  const shortcutsA = [
    ...(seasonShortcut
      ? [
          {
            label: `Temporada crítica ${seasonShortcut.year}`,
            range: seasonShortcut.range,
          },
        ]
      : []),
    ...(lastDaysRange
      ? [{ label: `Últimos ${LAST_DAYS} dias`, range: lastDaysRange }]
      : []),
  ];
  const shiftedB = (years: number) => {
    const start = shiftDate(rangeA.start, years);
    return { start, end: addDays(start, length - 1) };
  };
  const shortcutsB = [
    { label: `Mesmo período em ${yearA - 1}`, range: shiftedB(-1) },
    ...(record && record.year !== yearA
      ? [
          {
            label: `Ano recorde, ${record.year}`,
            range: shiftedB(record.year - yearA),
          },
        ]
      : []),
  ];
  const valueA = comparisons?.a?.value ?? null;
  const valueB = comparisons?.b?.value ?? null;
  const weekly = (values: (number | null)[]) =>
    Array.from({ length: Math.ceil(values.length / WEEK) }, (_, week) =>
      sumOf(values.slice(week * WEEK, week * WEEK + WEEK)),
    );
  const monthly = (range: DateRange, values: (number | null)[]) => {
    const groups = new Map<string, (number | null)[]>();
    datesBetween(range.start, range.end).forEach((date, index) => {
      const key = date.slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), values[index]]);
    });
    return [...groups.entries()].map(([key, group]) => ({
      key,
      value: sumOf(group),
    }));
  };
  const monthsA = comparisons ? monthly(rangeA, comparisons.daysA) : [];
  const monthsB = comparisons ? monthly(rangeB, comparisons.daysB) : [];
  const unit = SOURCE_SHORT_UNITS[source];
  const minDate = `${CALENDAR_FIRST_YEAR}-01-01`;

  return (
    <main className="mx-auto max-w-[1328px] px-4 pt-8 pb-24 sm:px-8 lg:px-16 lg:pt-12">
      <Link
        href={areaMapHref(area, yearA)}
        className="type-button inline-flex items-center gap-1.5 text-ink hover:underline"
      >
        <MaterialSymbol name="arrow_back" className="size-[18px]" />
        Voltar ao mapa
      </Link>
      <header className="mt-6 flex flex-col gap-2">
        <p className="type-eyebrow text-ink-muted">Comparar datas</p>
        <h1 className="type-heading-lg text-ink">
          {areaName} em dois períodos
        </h1>
        <p className="type-body max-w-[720px] text-ink-muted">
          Mesma região, mesma escala de cor. Os dois períodos têm a mesma
          duração e só contam dias completos.
        </p>
      </header>

      <section
        aria-label="Períodos comparados"
        className="mt-8 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center"
      >
        <RangeInputs
          letter="A"
          range={rangeA}
          min={minDate}
          max={completeDate}
          lockedEnd={false}
          onChange={setChosenA}
          shortcuts={shortcutsA}
        />
        <button
          type="button"
          onClick={() => {
            setChosenA(rangeB);
            setChosenBStart(rangeA.start);
          }}
          className={`${buttonClassName({ variant: "secondary", size: "md" })} self-center`}
        >
          <MaterialSymbol name="chevron_left" className="size-[18px]" />
          Trocar A e B
          <MaterialSymbol name="chevron_right" className="size-[18px]" />
        </button>
        <RangeInputs
          letter="B"
          range={rangeB}
          min={minDate}
          max={completeDate}
          lockedEnd
          onChange={(range) => setChosenBStart(range.start)}
          shortcuts={shortcutsB}
        />
      </section>

      <section
        aria-label="Mapas dos dois períodos"
        className="mt-8 grid gap-6 lg:grid-cols-2"
      >
        <PeriodMap
          letter="A"
          range={rangeA}
          fires={firesA}
          breaks={breaks}
          area={world ? null : area}
          bounds={bounds}
          areaName={areaName}
          harmonized={harmonized}
        />
        <PeriodMap
          letter="B"
          range={rangeB}
          fires={firesB}
          breaks={breaks}
          area={world ? null : area}
          bounds={bounds}
          areaName={areaName}
          harmonized={harmonized}
        />
      </section>
      {breaks.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          <span className="type-caption text-ink-muted">
            Focos por célula de 0,25°, a mesma escala nos dois mapas
          </span>
          <span className="grid max-w-xl grid-cols-6 gap-1">
            {HEAT_BACKGROUNDS.map((className, index) => (
              <span key={className} className="flex min-w-0 flex-col gap-1">
                <span className={`block h-2 rounded-xs ${className}`} />
                <span className="truncate text-[10px] leading-3 text-ink-muted tabular-nums">
                  {heatRangeLabel(
                    index === 0 ? null : breaks[index - 1],
                    index === HEAT_BACKGROUNDS.length - 1
                      ? null
                      : breaks[index],
                  )}
                </span>
              </span>
            ))}
          </span>
        </div>
      )}

      <section
        aria-label="Resumo da comparação"
        className="mt-10 grid gap-6 lg:grid-cols-3"
      >
        <SummaryCard eyebrow={labelA}>
          <p className="flex items-baseline gap-2">
            <span className="type-stat-xl text-ink">
              {valueA === null ? "-" : formatCount(valueA)}
            </span>
            <span className="type-body-sm text-ink-muted">focos</span>
          </p>
          {valueA !== null && comparisons?.a?.typical != null ? (
            <DeltaBadge value={valueA} typical={comparisons.a.typical} />
          ) : null}
          <p className="type-body-sm text-ink-muted">{unit}</p>
        </SummaryCard>
        <SummaryCard eyebrow={labelB}>
          <p className="flex items-baseline gap-2">
            <span className="type-stat-xl text-ink">
              {valueB === null ? "-" : formatCount(valueB)}
            </span>
            <span className="type-body-sm text-ink-muted">focos</span>
          </p>
          {valueB !== null && comparisons?.b?.typical != null ? (
            <DeltaBadge value={valueB} typical={comparisons.b.typical} />
          ) : null}
          <p className="type-body-sm text-ink-muted">
            {comparisons?.b?.rank && comparisons.b.rank.of > 1
              ? comparisons.b.rank.rank === 1
                ? `O mais ativo nestas datas em ${yearsLabel(comparisons.b.rank.of)}.`
                : `${comparisons.b.rank.rank}º mais ativo nestas datas em ${yearsLabel(comparisons.b.rank.of)}.`
              : unit}
          </p>
        </SummaryCard>
        <SummaryCard eyebrow="Diferença">
          {valueA !== null && valueB !== null ? (
            <>
              <p className="type-stat-xl text-ink">
                {valueB === 0
                  ? "-"
                  : `${valueA >= valueB ? "+" : "-"}${Math.abs(Math.round(((valueA - valueB) / valueB) * 100))}%`}
              </p>
              <TrendBadge
                text={`${formatCompact(Math.abs(valueA - valueB))} focos ${valueA >= valueB ? "a mais" : "a menos"}`}
                direction={
                  valueA > valueB
                    ? "above"
                    : valueA < valueB
                      ? "below"
                      : "equal"
                }
              />
              <p className="type-body-sm text-ink-muted">
                A em relação a B.
                {comparisons?.a?.typical != null &&
                  ` A ficou ${difference(valueA, comparisons.a.typical).text} para estas datas.`}
              </p>
            </>
          ) : (
            <p className="type-body text-ink-muted">
              Ainda faltam dados de algum dia de um dos períodos.
            </p>
          )}
        </SummaryCard>
      </section>

      {comparisons && (
        <section aria-label="Evolução" className="mt-10 flex flex-col gap-6">
          <WeekChart
            weeksA={weekly(comparisons.daysA)}
            weeksB={weekly(comparisons.daysB)}
            labelA={labelA}
            labelB={labelB}
          />
          <div className="relative overflow-x-auto rounded-md border border-line bg-surface">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <caption className="type-heading-sm p-4 text-left text-ink sm:p-6">
                Mês a mês
              </caption>
              <thead>
                <tr className="border-t border-line">
                  {[
                    "Mês",
                    `A · ${yearA}`,
                    `B · ${yearB}`,
                    "A em relação a B",
                  ].map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="type-caption px-4 py-3 font-normal text-ink-muted sm:px-6"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="type-body-sm">
                {monthsA.map((month, index) => {
                  const other = monthsB[index];
                  const nameA = MONTH_NAMES[Number(month.key.slice(5)) - 1];
                  const nameB = other
                    ? MONTH_NAMES[Number(other.key.slice(5)) - 1]
                    : "";
                  const change =
                    month.value !== null && other?.value != null
                      ? changeText(month.value, other.value)
                      : null;
                  return (
                    <tr key={month.key} className="border-t border-line">
                      <th
                        scope="row"
                        className="px-4 py-3 font-normal text-ink sm:px-6"
                      >
                        {nameA === nameB || !nameB
                          ? nameA
                          : `${nameA} · ${nameB}`}
                      </th>
                      <td className="px-4 py-3 text-ink tabular-nums sm:px-6">
                        {month.value === null ? "-" : formatCount(month.value)}
                      </td>
                      <td className="px-4 py-3 text-ink tabular-nums sm:px-6">
                        {other?.value == null ? "-" : formatCount(other.value)}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        {change ? <TrendBadge {...change} /> : "-"}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-line-strong font-semibold">
                  <th scope="row" className="px-4 py-3 text-ink sm:px-6">
                    Total
                  </th>
                  <td className="px-4 py-3 text-ink tabular-nums sm:px-6">
                    {valueA === null ? "-" : formatCount(valueA)}
                  </td>
                  <td className="px-4 py-3 text-ink tabular-nums sm:px-6">
                    {valueB === null ? "-" : formatCount(valueB)}
                  </td>
                  <td className="px-4 py-3 sm:px-6">
                    {valueA !== null && valueB !== null ? (
                      <TrendBadge {...changeText(valueA, valueB)} />
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
