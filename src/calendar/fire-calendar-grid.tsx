"use client";

import { type CSSProperties, useState } from "react";
import { WEEKS_PER_YEAR } from "@/harmonization/calendar-day";
import type { CalendarWeek, FireCalendar } from "@/harmonization/fire-calendar";
import { activityColor } from "./activity-color";
import { CalendarLegend } from "./calendar-legend";

type CalendarMode = "harmonized" | "observed";

const CALENDAR_MODES: { mode: CalendarMode; label: string }[] = [
  { mode: "harmonized", label: "Harmonized" },
  { mode: "observed", label: "Observed" },
];

const WEEK_LABEL_INTERVAL = 4;

const GRID_POSITION =
  "[grid-column:var(--year-line)] [grid-row:var(--week-line)] lg:[grid-column:var(--week-line)] lg:[grid-row:var(--year-line)]";

export function FireCalendarGrid({
  calendar,
  selectedWeek,
  onSelectWeek,
}: {
  calendar: FireCalendar;
  selectedWeek: CalendarWeek | null;
  onSelectWeek: (week: CalendarWeek) => void;
}) {
  const [mode, setMode] = useState<CalendarMode>("harmonized");
  const years = Array.from(
    { length: calendar.lastYear - calendar.firstYear + 1 },
    (_, index) => calendar.firstYear + index,
  );
  const weekNumbers = Array.from(
    { length: WEEKS_PER_YEAR },
    (_, index) => index + 1,
  );
  const maximumCellDays = Math.max(
    1,
    ...calendar.weeks.map((week) =>
      Math.max(week.harmonizedCellDays, week.observedCellDays),
    ),
  );
  const yearLine = (year: number) => year - calendar.firstYear + 2;

  return (
    <section aria-label="Fire calendar" className="space-y-3">
      <div
        role="group"
        aria-label="Values"
        className="inline-flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900"
      >
        {CALENDAR_MODES.map(({ mode: option, label }) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className="min-h-11 rounded-md px-4 text-sm font-medium text-neutral-600 aria-pressed:bg-white aria-pressed:text-neutral-950 aria-pressed:shadow-sm dark:text-neutral-400 dark:aria-pressed:bg-neutral-800 dark:aria-pressed:text-white"
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="grid grid-cols-[1.75rem_repeat(var(--years),minmax(0,1fr))] grid-rows-[auto_repeat(52,0.625rem)] gap-px lg:grid-cols-[2.75rem_repeat(52,minmax(0,1fr))] lg:grid-rows-[auto_repeat(var(--years),0.875rem)]"
        style={{ "--years": years.length } as CSSProperties}
      >
        {years.map((year) => (
          <span
            key={year}
            className={`${GRID_POSITION} pb-1 text-center text-[0.5rem] leading-none text-neutral-500 lg:pr-2 lg:pb-0 lg:text-right lg:text-xs`}
            style={
              {
                "--year-line": yearLine(year),
                "--week-line": 1,
              } as CSSProperties
            }
          >
            <span className="lg:hidden">{String(year).slice(2)}</span>
            <span className="hidden lg:inline">{year}</span>
          </span>
        ))}

        {weekNumbers.map((week) => (
          <span
            key={week}
            className={`${GRID_POSITION} pr-1 text-right text-[0.5rem] leading-[0.625rem] text-neutral-500 lg:pr-0 lg:pb-1 lg:text-center ${calendar.fireSeason.includes(week) ? "bg-orange-200 dark:bg-orange-900" : ""}`}
            style={
              { "--year-line": 1, "--week-line": week + 1 } as CSSProperties
            }
          >
            {(week - 1) % WEEK_LABEL_INTERVAL === 0 ? week : ""}
          </span>
        ))}

        {calendar.weeks.map((week) => {
          const cellDays =
            mode === "harmonized"
              ? week.harmonizedCellDays
              : week.observedCellDays;
          const selected =
            selectedWeek?.year === week.year && selectedWeek.week === week.week;
          return (
            <button
              key={`${week.year}-${week.week}`}
              type="button"
              aria-label={`Week ${week.week}, ${week.year}: ${cellDays} cell-days${week.anomaly ? ", anomaly" : ""}`}
              aria-pressed={selected}
              onClick={() => onSelectWeek(week)}
              className={`${GRID_POSITION} rounded-[2px] bg-neutral-200 dark:bg-neutral-800 ${week.anomaly ? "ring-1 ring-neutral-950 ring-inset dark:ring-white" : ""} ${selected ? "outline-2 outline-offset-1 outline-sky-600" : ""}`}
              style={
                {
                  "--year-line": yearLine(week.year),
                  "--week-line": week.week + 1,
                  backgroundColor: activityColor(cellDays, maximumCellDays),
                } as CSSProperties
              }
            />
          );
        })}
      </div>

      <CalendarLegend />
    </section>
  );
}
