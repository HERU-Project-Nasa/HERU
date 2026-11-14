"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { MaterialSymbol } from "@/icons/material-symbols";
import {
  HATCH,
  HEAT_BACKGROUNDS,
  LIGHT_HATCH,
  OUTLIER_RING,
  PARTIAL_STRIPES,
  SENSOR_BACKGROUNDS,
} from "./calendar-cell-style";
import {
  formatCompact,
  formatCount,
  MONTH_ABBREVIATIONS,
  MONTH_INITIALS,
  MONTH_NAMES,
  monthTitle,
} from "./calendar-labels";
import {
  CALENDAR_FIRST_YEAR,
  type CalendarCell,
  type CalendarSource,
  type CalendarYear,
} from "./calendar-matrix";
import {
  type CalendarAnalysis,
  heatLevel,
  monthRank,
  type YearTotal,
} from "./calendar-statistics";
import { CellTooltip } from "./cell-tooltip";

const GRID_COLUMNS =
  "grid grid-cols-[2.25rem_3px_repeat(12,minmax(0,1fr))_2.75rem] gap-x-0.5 sm:grid-cols-[3.5rem_4px_repeat(12,minmax(0,1fr))_9.5rem] sm:gap-x-[3px]";

const TOOLTIP_ID = "calendar-cell-tooltip";
const TOTAL_BAR_WIDTH = 40;

type TooltipPlace = {
  cell: CalendarCell;
  left: number;
  top: number;
  above: boolean;
};

const STATE_DESCRIPTIONS: Partial<Record<CalendarCell["state"], string>> = {
  "no-data": "sem dados",
  computing: "em cálculo",
  loading: "carregando",
  future: "ainda não aconteceu",
};

function cellLabel(cell: CalendarCell, outlier: boolean): string {
  const parts = [
    cell.state === "value" || cell.state === "zero"
      ? `${formatCount(cell.value!)} focos`
      : STATE_DESCRIPTIONS[cell.state]!,
  ];
  if (outlier) parts.push("fora do padrão");
  if (cell.provisional) parts.push("preliminar");
  if (cell.partial) parts.push("parcial");
  return `${monthTitle(cell)}: ${parts.join(", ")}`;
}

function seasonRuns(months: number[]): number[][] {
  const runs: number[][] = [];
  for (const month of months) {
    const run = runs.at(-1);
    if (run && month === run[run.length - 1] + 1) {
      run.push(month);
    } else {
      runs.push([month]);
    }
  }
  return runs;
}

function CellFace({
  cell,
  level,
  outlier,
}: {
  cell: CalendarCell;
  level: number;
  outlier: boolean;
}) {
  const background =
    cell.state === "value"
      ? HEAT_BACKGROUNDS[level - 1]
      : cell.state === "zero"
        ? "bg-heat-0 border border-line"
        : cell.state === "future"
          ? "border border-line/40"
          : "border border-line";
  const hatch =
    cell.state === "no-data" || cell.state === "computing"
      ? HATCH
      : cell.state === "loading"
        ? LIGHT_HATCH
        : undefined;
  return (
    <span
      className={`relative flex h-4 items-center justify-center overflow-hidden rounded-xs sm:h-5 ${background}`}
      style={{
        backgroundImage: hatch,
        boxShadow: outlier
          ? OUTLIER_RING
          : cell.partial
            ? "inset 0 0 0 1px var(--color-surface-ground)"
            : undefined,
      }}
    >
      {cell.partial && (cell.state === "value" || cell.state === "zero") && (
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundImage: PARTIAL_STRIPES }}
        />
      )}
      {cell.state === "computing" && (
        <MaterialSymbol name="schedule" className="size-3 text-ink-muted" />
      )}
      {cell.state === "loading" && (
        <span
          aria-hidden="true"
          className="text-[10px] leading-none text-ink-muted"
        >
          ...
        </span>
      )}
      {outlier && (
        <span
          aria-hidden="true"
          className="absolute top-[3px] right-[3px] size-1 rounded-full bg-ink shadow-[0_0_0_1px_var(--color-surface-ground)]"
        />
      )}
    </span>
  );
}

function TotalMark({
  total,
  largest,
}: {
  total: YearTotal | undefined;
  largest: number;
}) {
  if (!total || total.total === null) {
    return (
      <span className="type-caption pl-1 text-ink-disabled sm:pl-2">-</span>
    );
  }
  const settled = total.complete || total.partial;
  return (
    <span
      className="flex min-w-0 items-center gap-1.5 pl-1 sm:pl-2"
      title={
        settled ? undefined : "Soma dos meses com dado. Ainda faltam meses."
      }
    >
      <span
        aria-hidden="true"
        className="hidden h-1.5 shrink-0 rounded-[1px] bg-line-strong sm:block"
        style={{
          width: largest
            ? Math.max(2, Math.round((total.total / largest) * TOTAL_BAR_WIDTH))
            : 0,
        }}
      />
      <span
        className={`truncate text-[11px] leading-4 whitespace-nowrap tabular-nums sm:text-xs ${settled ? "text-ink-muted" : "text-ink-disabled"}`}
      >
        {formatCompact(total.total)}
        {total.partial && <span className="hidden sm:inline"> até agora</span>}
      </span>
    </span>
  );
}

export function CalendarGrid({
  areaName,
  years,
  allYears,
  analysis,
  enabledMonths,
  source,
  lastDataDate,
}: {
  areaName: string;
  years: CalendarYear[];
  allYears: CalendarYear[];
  analysis: CalendarAnalysis;
  enabledMonths: boolean[];
  source: CalendarSource;
  lastDataDate: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipPlace | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const outlierKeys = new Set(analysis.outliers.map((cell) => cell.key));
  const openCells = years.flatMap((year) =>
    year.cells.filter((cell) => cell.state !== "future"),
  );
  const focusKey = openCells.some((cell) => cell.key === activeKey)
    ? activeKey
    : (openCells.at(-1)?.key ?? null);

  const showTooltip = (cell: CalendarCell, element: HTMLElement) => {
    const container = containerRef.current;
    if (!container || cell.state === "future") {
      return;
    }
    const box = container.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const half = Math.min(140, box.width / 2);
    const center = rect.left - box.left + rect.width / 2;
    const above = rect.top - box.top > box.height / 2;
    setTooltip({
      cell,
      left: Math.min(Math.max(center, half), box.width - half),
      top: above ? rect.top - box.top - 8 : rect.bottom - box.top + 8,
      above,
    });
  };

  const moveFocus = (event: KeyboardEvent<HTMLElement>, cell: CalendarCell) => {
    let row = years.findIndex((year) => year.year === cell.year);
    let column = cell.month - 1;
    if (event.key === "ArrowRight") column++;
    else if (event.key === "ArrowLeft") column--;
    else if (event.key === "ArrowDown") row++;
    else if (event.key === "ArrowUp") row--;
    else if (event.key === "Home") column = 0;
    else if (event.key === "End") column = 11;
    else if (event.key === "Escape") {
      setTooltip(null);
      return;
    } else return;
    event.preventDefault();
    const target = years[row]?.cells[column];
    if (!target || target.state === "future") {
      return;
    }
    setActiveKey(target.key);
    containerRef.current
      ?.querySelector<HTMLElement>(`[data-key="${target.key}"]`)
      ?.focus();
  };

  const runs = analysis.season ? seasonRuns(analysis.season.months) : [];
  const labelRun = runs.reduce<number[] | null>(
    (longest, run) => (!longest || run.length > longest.length ? run : longest),
    null,
  );
  const shortestBaseline = Math.min(
    ...analysis.baselines.map((baseline) => baseline?.years ?? 0),
  );

  return (
    <div ref={containerRef} className="relative">
      {runs.length > 0 && (
        <div aria-hidden="true" className={`${GRID_COLUMNS} mb-1`}>
          {runs.map((run) => (
            <span
              key={run[0]}
              className="flex flex-col items-center justify-end gap-0.5"
              style={{
                gridColumn: `${run[0] + 3} / ${run[run.length - 1] + 4}`,
              }}
            >
              {run === labelRun && (
                <span className="type-caption whitespace-nowrap text-ink">
                  Temporada crítica
                </span>
              )}
              <span className="block h-1.5 w-full rounded-t-xs border border-b-0 border-ink" />
            </span>
          ))}
        </div>
      )}
      <div aria-hidden="true" className={`${GRID_COLUMNS} mb-1.5`}>
        <span />
        <span />
        {MONTH_ABBREVIATIONS.map((abbreviation, index) => (
          <span
            key={abbreviation}
            className={`type-caption text-center text-ink-muted ${enabledMonths[index] ? "" : "opacity-40"}`}
          >
            <span className="sm:hidden">{MONTH_INITIALS[index]}</span>
            <span className="hidden sm:inline">{abbreviation}</span>
          </span>
        ))}
        <span className="type-caption pl-1 text-ink-muted sm:pl-2">Total</span>
      </div>
      <div
        role="grid"
        aria-label={`Calendário de atividade de queima, ${areaName}`}
        className="flex flex-col gap-0.5 sm:gap-[3px]"
      >
        {years.map((year) => (
          <div
            key={year.year}
            role="row"
            className={`${GRID_COLUMNS} items-center`}
          >
            <span
              role="rowheader"
              className="type-caption tracking-[0.04em] text-ink-muted tabular-nums"
            >
              <span className="sm:hidden">{String(year.year).slice(2)}</span>
              <span className="hidden sm:inline">{year.year}</span>
            </span>
            <span
              aria-hidden="true"
              title={
                year.sensor === "modis"
                  ? "MODIS"
                  : year.sensor
                    ? "VIIRS"
                    : undefined
              }
              className={`block h-4 rounded-[1px] sm:h-5 ${year.sensor ? SENSOR_BACKGROUNDS[year.sensor] : ""}`}
            />
            {year.cells.map((cell, index) => {
              const outlier = outlierKeys.has(cell.key);
              const open = cell.state !== "future";
              return (
                <div
                  key={cell.key}
                  role="gridcell"
                  data-key={cell.key}
                  tabIndex={open ? (cell.key === focusKey ? 0 : -1) : undefined}
                  aria-disabled={open ? undefined : true}
                  aria-label={cellLabel(cell, outlier)}
                  aria-describedby={
                    tooltip?.cell.key === cell.key ? TOOLTIP_ID : undefined
                  }
                  onMouseEnter={(event) =>
                    showTooltip(cell, event.currentTarget)
                  }
                  onMouseLeave={() => setTooltip(null)}
                  onFocus={(event) => {
                    setActiveKey(cell.key);
                    showTooltip(cell, event.currentTarget);
                  }}
                  onBlur={() => setTooltip(null)}
                  onKeyDown={(event) => moveFocus(event, cell)}
                  className={`rounded-xs outline-offset-1 ${enabledMonths[index] ? "" : "opacity-20"} ${open ? "cursor-default" : ""}`}
                >
                  <CellFace
                    cell={cell}
                    level={
                      cell.state === "value"
                        ? heatLevel(cell.value!, analysis.breaks)
                        : 0
                    }
                    outlier={outlier}
                  />
                </div>
              );
            })}
            <TotalMark
              total={analysis.totals.get(year.year)}
              largest={analysis.largestTotal}
            />
          </div>
        ))}
        <div
          role="row"
          className={`${GRID_COLUMNS} mt-2 items-center border-t border-dashed border-line-strong pt-2`}
        >
          <span role="rowheader" className="type-caption text-ink">
            <span className="sm:hidden">Med.</span>
            <span className="hidden sm:inline">Mediana</span>
          </span>
          <span />
          {analysis.baselines.map((baseline, index) => (
            <span
              key={MONTH_NAMES[index]}
              role="gridcell"
              aria-label={
                baseline
                  ? `Mediana de ${MONTH_NAMES[index]}: ${formatCount(baseline.median)} focos`
                  : `Mediana de ${MONTH_NAMES[index]}: sem referência`
              }
              title={
                baseline
                  ? `Mediana de ${MONTH_NAMES[index]}: ${formatCount(baseline.median)} focos em ${baseline.years} anos`
                  : undefined
              }
              className={`block h-4 rounded-xs shadow-[inset_0_0_0_1px_var(--color-surface-ground)] sm:h-5 ${
                !baseline
                  ? "border border-line"
                  : baseline.median > 0
                    ? HEAT_BACKGROUNDS[
                        heatLevel(baseline.median, analysis.breaks) - 1
                      ]
                    : "bg-heat-0"
              } ${enabledMonths[index] ? "" : "opacity-20"}`}
              style={baseline ? undefined : { backgroundImage: HATCH }}
            />
          ))}
          <span className="pl-1 text-[11px] leading-4 text-ink-muted sm:pl-2 sm:text-xs">
            {shortestBaseline < analysis.baselineYearCount ? (
              <>
                <span className="sm:hidden">
                  {shortestBaseline}/{analysis.baselineYearCount}
                </span>
                <span className="hidden sm:inline">
                  carregando, {shortestBaseline} de {analysis.baselineYearCount}{" "}
                  anos
                </span>
              </>
            ) : (
              <>
                <span className="sm:hidden">
                  {String(CALENDAR_FIRST_YEAR).slice(2)}-
                  {String(analysis.lastBaselineYear).slice(2)}
                </span>
                <span className="hidden sm:inline">
                  {CALENDAR_FIRST_YEAR}-{analysis.lastBaselineYear}
                </span>
              </>
            )}
          </span>
        </div>
      </div>
      {tooltip && (
        <div
          className="pointer-events-none absolute z-30"
          style={{
            left: tooltip.left,
            top: tooltip.top,
            transform: `translate(-50%, ${tooltip.above ? "-100%" : "0"})`,
          }}
        >
          <CellTooltip
            id={TOOLTIP_ID}
            cell={tooltip.cell}
            analysis={analysis}
            rank={monthRank(tooltip.cell, allYears)}
            outlier={outlierKeys.has(tooltip.cell.key)}
            source={source}
            lastDataDate={lastDataDate}
          />
        </div>
      )}
    </div>
  );
}
