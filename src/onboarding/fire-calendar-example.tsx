"use client";

import { useEffect, useRef } from "react";
import { HEAT_BACKGROUNDS } from "@/fire-calendar/calendar-cell-style";
import {
  type CalendarBar,
  startCalendarBars,
} from "@/calendar-3d/calendar-bars-scene";
import {
  ILLUSTRATIVE_CALENDAR,
  ILLUSTRATIVE_OUT_OF_PATTERN,
  ILLUSTRATIVE_PARTIAL_MONTH,
} from "./illustrative-calendar";

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

const HEAT_SCALE = [
  { limit: 1, label: "0", className: "border border-line bg-heat-0" },
  { limit: 1_000, label: "< 1 mil", className: HEAT_BACKGROUNDS[0] },
  { limit: 3_000, label: "1-3 mil", className: HEAT_BACKGROUNDS[1] },
  { limit: 10_000, label: "3-10 mil", className: HEAT_BACKGROUNDS[2] },
  { limit: 30_000, label: "10-30 mil", className: HEAT_BACKGROUNDS[3] },
  { limit: 100_000, label: "30-100 mil", className: HEAT_BACKGROUNDS[4] },
  { limit: Infinity, label: "≥ 100 mil", className: HEAT_BACKGROUNDS[5] },
];

const OUT_OF_PATTERN_RING =
  "shadow-[inset_0_0_0_1.5px_var(--color-ink),0_0_0_1px_var(--color-surface-ground)]";
const IN_PROGRESS_STRIPES =
  "bg-[repeating-linear-gradient(135deg,rgba(10,10,11,0)_0_4px,rgba(10,10,11,0.55)_4px_6px)]";
const COUNT_FORMAT = new Intl.NumberFormat("pt-BR");

const BARS: CalendarBar[] = ILLUSTRATIVE_CALENDAR.flatMap(
  ({ year, monthlyCounts }, row) =>
    monthlyCounts.map((count, month) => {
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
      const outOfPattern = ILLUSTRATIVE_OUT_OF_PATTERN.includes(monthKey);
      const inProgress = monthKey === ILLUSTRATIVE_PARTIAL_MONTH;
      return {
        row,
        month,
        count,
        heat:
          count === null
            ? 0
            : HEAT_SCALE.findIndex((step) => count < step.limit),
        outOfPattern,
        inProgress,
        label: cellLabel(year, month, count, outOfPattern, inProgress),
      };
    }),
);

export function FireCalendarExample() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      startCalendarBars(stageRef.current!, canvasRef.current!, BARS, {
        months: MONTHS.map(([, abbreviation]) => abbreviation),
        years: ILLUSTRATIVE_CALENDAR.map(({ year }) => String(year)),
        tooltip: tooltipRef.current!,
      }),
    [],
  );

  return (
    <figure className="rounded-xl border border-line bg-surface px-5 py-6 sm:px-10 sm:py-8">
      <figcaption>
        <p className="type-heading-sm text-ink">Brasil, 2015-2026</p>
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
        aria-label="Calendário de fogo, focos por mês"
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
        {ILLUSTRATIVE_CALENDAR.map(({ year }, row) => (
          <div key={year} role="row">
            <span role="rowheader">{year}</span>
            {BARS.filter((bar) => bar.row === row).map((bar) => (
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
            {HEAT_SCALE.map((step) => (
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

function cellLabel(
  year: number,
  month: number,
  count: number | null,
  outOfPattern: boolean,
  inProgress: boolean,
): string {
  const monthName = `${MONTHS[month][0]} de ${year}`;
  if (count === null) {
    return `${monthName}: sem dados ainda`;
  }
  return `${monthName}: ${COUNT_FORMAT.format(count)} focos${outOfPattern ? ", fora do padrão" : ""}${inProgress ? ", parcial" : ""}`;
}

function OutOfPatternDot() {
  return (
    <span className="absolute top-0.5 right-0.5 size-1 rounded-full bg-ink shadow-[0_0_0_1px_var(--color-surface-ground)] sm:top-[3px] sm:right-[3px]" />
  );
}
