"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  type CalendarBar,
  startCalendarBars,
} from "@/calendar-3d/calendar-bars-scene";
import { HEAT_BACKGROUNDS } from "@/fire-calendar/calendar-cell-style";
import { formatCount, heatRangeLabel } from "@/fire-calendar/calendar-labels";
import {
  buildCalendarYears,
  type CalendarCell,
  type CalendarYear,
} from "@/fire-calendar/calendar-matrix";
import {
  analyzeCalendar,
  heatLevel,
  isMeasured,
} from "@/fire-calendar/calendar-statistics";
import { type CoverageRow, readCoverage } from "@/pipeline/pipeline-coverage";
import { usePipelineFile } from "@/pipeline/pipeline-files";
import { type SeriesMonthRow, seriesPath } from "@/pipeline/series-row";

const EXAMPLE_AREA = "USA";
const EXAMPLE_YEARS = 12;
const ALL_MONTHS = Array(12).fill(true);

const MONTHS = [
  ["janeiro", "jan"],
  ["fevereiro", "fev"],
  ["março", "mar"],
  ["abril", "abr"],
  ["maio", "mai"],
  ["junho", "jun"],
  ["julho", "jul"],
  ["agosto", "ago"],
  ["setembro", "set"],
  ["outubro", "out"],
  ["novembro", "nov"],
  ["dezembro", "dez"],
];

type CalendarExample = {
  years: CalendarYear[];
  bars: CalendarBar[];
  scale: { label: string; className: string }[];
};

function buildExample(
  coverageRows: CoverageRow[] | null,
  monthlyRows: SeriesMonthRow[] | null,
): CalendarExample | null {
  if (!coverageRows || !monthlyRows) {
    return null;
  }
  const allYears = buildCalendarYears(
    monthlyRows,
    readCoverage(coverageRows),
    "harmonized",
    "all",
  );
  if (allYears.length === 0) {
    return null;
  }
  const analysis = analyzeCalendar(allYears, allYears, ALL_MONTHS);
  const outliers = new Set(analysis.outliers.map((cell) => cell.key));
  const years = allYears.slice(-EXAMPLE_YEARS);
  const bars = years.flatMap((year, row) =>
    year.cells.map((cell): CalendarBar => {
      const measured = isMeasured(cell);
      const outOfPattern = outliers.has(cell.key);
      return {
        row,
        month: cell.month - 1,
        count: measured ? (cell.value ?? 0) : null,
        heat:
          cell.state === "value" && cell.value
            ? heatLevel(cell.value, analysis.breaks)
            : 0,
        outOfPattern,
        inProgress: cell.partial && measured,
        label: cellLabel(cell, outOfPattern),
      };
    }),
  );
  const limits = analysis.breaks;
  const scale = [
    { label: "0", className: "border border-line bg-heat-0" },
    ...HEAT_BACKGROUNDS.map((className, index) => ({
      className,
      label:
        limits.length === 0
          ? "> 0"
          : heatRangeLabel(
              index === 0 ? null : limits[index - 1],
              index === HEAT_BACKGROUNDS.length - 1 ? null : limits[index],
            ),
    })),
  ];
  return { years, bars, scale };
}

const OUT_OF_PATTERN_RING =
  "shadow-[inset_0_0_0_1.5px_var(--color-ink),0_0_0_1px_var(--color-surface-ground)]";
const IN_PROGRESS_STRIPES =
  "bg-[repeating-linear-gradient(135deg,rgba(10,10,11,0)_0_4px,rgba(10,10,11,0.55)_4px_6px)]";
export function FireCalendarExample() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const coverageRows = usePipelineFile<CoverageRow>("meta/coverage.csv").rows;
  const monthlyRows = usePipelineFile<SeriesMonthRow>(
    seriesPath("monthly", EXAMPLE_AREA),
  ).rows;
  const example = useMemo(
    () => buildExample(coverageRows, monthlyRows),
    [coverageRows, monthlyRows],
  );

  useEffect(() => {
    if (!example) {
      return;
    }
    return startCalendarBars(
      stageRef.current!,
      canvasRef.current!,
      example.bars,
      {
        months: MONTHS.map(([, abbreviation]) => abbreviation),
        years: example.years.map(({ year }) => String(year)),
        tooltip: tooltipRef.current!,
      },
    );
  }, [example]);

  const firstYear = example?.years[0]?.year;
  const lastYear = example?.years.at(-1)?.year;

  return (
    <figure className="rounded-xl border border-line bg-surface px-5 py-6 sm:px-10 sm:py-8">
      <figcaption>
        <p className="type-heading-sm min-h-6 text-ink">
          Estados Unidos
          {firstYear && lastYear ? `, ${firstYear}-${lastYear}` : ""}
        </p>
        <p className="type-caption mt-1 text-ink-muted">
          Focos por mês · equivalente VIIRS
        </p>
      </figcaption>
      <div
        ref={stageRef}
        aria-hidden="true"
        className="relative mt-4 aspect-[4/3] touch-none overflow-hidden select-none"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full cursor-grab"
        />
        <span
          ref={tooltipRef}
          className="type-body-sm pointer-events-none absolute top-0 left-0 rounded-sm border border-line bg-surface-ground/90 px-2.5 py-1.5 whitespace-nowrap text-ink opacity-0 backdrop-blur-sm transition-opacity duration-150"
        />
        <span className="type-caption pointer-events-none absolute right-0 bottom-0 text-ink-disabled normal-case tracking-normal">
          arraste para girar
        </span>
      </div>
      <div
        role="table"
        aria-label="Calendário de fontes de calor, focos por mês"
        className="sr-only"
      >
        <div role="row">
          <span role="columnheader">Ano</span>
          {MONTHS.map(([name]) => (
            <span key={name} role="columnheader">
              {name}
            </span>
          ))}
        </div>
        {example?.years.map(({ year }, row) => (
          <div key={year} role="row">
            <span role="rowheader">{year}</span>
            {example.bars
              .filter((bar) => bar.row === row)
              .map((bar) => (
                <span key={bar.month} role="cell">
                  {bar.label}
                </span>
              ))}
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="type-caption text-ink-muted">Focos por mês</span>
          <ul className="grid grid-cols-4 gap-1 sm:grid-cols-7">
            {(example?.scale ?? []).map((step) => (
              <li key={step.label} className="flex min-w-0 flex-col gap-1.5">
                <span
                  aria-hidden="true"
                  className={`h-3 rounded-xs ${step.className}`}
                />
                <span className="font-ui text-xs leading-4 whitespace-nowrap text-ink-muted tabular-nums">
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <ul className="type-body-sm flex flex-wrap gap-x-6 gap-y-2 text-ink">
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`relative h-4 w-7 rounded-xs ${HEAT_BACKGROUNDS[5]} ${OUT_OF_PATTERN_RING}`}
            >
              <OutOfPatternDot />
            </span>
            Fora do padrão
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-4 w-7 rounded-xs ${HEAT_BACKGROUNDS[3]} ${IN_PROGRESS_STRIPES}`}
            />
            Mês em andamento
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-4 w-7 rounded-xs border border-dashed border-line"
            />
            Sem dados ainda
          </li>
        </ul>
      </div>
    </figure>
  );
}

function cellLabel(cell: CalendarCell, outOfPattern: boolean): string {
  const monthName = `${MONTHS[cell.month - 1][0]} de ${cell.year}`;
  if (!isMeasured(cell)) {
    return `${monthName}: sem dados ainda`;
  }
  return `${monthName}: ${formatCount(cell.value ?? 0)} focos${outOfPattern ? ", fora do padrão" : ""}${cell.partial ? ", parcial" : ""}${cell.provisional ? ", preliminar" : ""}`;
}

function OutOfPatternDot() {
  return (
    <span className="absolute top-0.5 right-0.5 size-1 rounded-full bg-ink shadow-[0_0_0_1px_var(--color-surface-ground)] sm:top-[3px] sm:right-[3px]" />
  );
}
