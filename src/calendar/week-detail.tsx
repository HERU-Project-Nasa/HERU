import { sensorNames } from "@/firms/sensor";
import { calendarDate, isoDate, weekDays } from "@/harmonization/calendar-day";
import type { CalendarWeek } from "@/harmonization/fire-calendar";
import type { ObservedWeekState } from "./use-observed-week";

const DAY_LABEL = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function WeekDetail({
  week,
  isFireSeason,
  observedWeekState,
  onPrevious,
  onNext,
}: {
  week: CalendarWeek;
  isFireSeason: boolean;
  observedWeekState: ObservedWeekState;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const days = weekDays(week.year, week.week);
  const firstDay = DAY_LABEL.format(new Date(isoDate(days[0])));
  const lastDay = DAY_LABEL.format(new Date(isoDate(days.at(-1)!)));

  return (
    <aside className="fixed inset-x-0 bottom-0 z-10 max-h-[45vh] overflow-y-auto rounded-t-2xl border-t border-neutral-200 bg-white px-4 pt-4 pb-6 shadow-lg lg:sticky lg:top-4 lg:max-h-none lg:self-start lg:rounded-2xl lg:border dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Week {week.week}, {week.year}
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {firstDay} to {lastDay}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous week"
            disabled={!onPrevious}
            onClick={onPrevious ?? undefined}
            className="size-11 rounded-full border border-neutral-300 text-lg disabled:opacity-40 dark:border-neutral-700"
          >
            &lt;
          </button>
          <button
            type="button"
            aria-label="Next week"
            disabled={!onNext}
            onClick={onNext ?? undefined}
            className="size-11 rounded-full border border-neutral-300 text-lg disabled:opacity-40 dark:border-neutral-700"
          >
            &gt;
          </button>
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold tabular-nums">
        {week.harmonizedCellDays.toLocaleString("en")} cell-days
      </p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {week.expected > 0
          ? `${(week.harmonizedCellDays / week.expected).toFixed(1)}x the median of ${week.expected.toLocaleString("en")}`
          : "Usually no activity in this week"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
        {week.anomaly && (
          <span className="rounded-full bg-neutral-950 px-2 py-1 text-white dark:bg-white dark:text-neutral-950">
            Above the 90th percentile
          </span>
        )}
        {isFireSeason && (
          <span className="rounded-full bg-orange-200 px-2 py-1 text-orange-950 dark:bg-orange-900 dark:text-orange-50">
            Fire season
          </span>
        )}
      </div>
      <p className="mt-3 text-sm">
        Observed by {sensorNames[week.observedSensor]}:{" "}
        <span className="tabular-nums">
          {week.observedCellDays.toLocaleString("en")} cell-days
        </span>
      </p>

      <DailyActivity dayNumbers={days} observedWeekState={observedWeekState} />
    </aside>
  );
}

function DailyActivity({
  dayNumbers,
  observedWeekState,
}: {
  dayNumbers: number[];
  observedWeekState: ObservedWeekState;
}) {
  if (observedWeekState.status !== "ready") {
    return (
      <p className="mt-4 text-sm text-neutral-500">
        {observedWeekState.status === "unavailable"
          ? "Daily cells are not available for this week."
          : "Loading daily cells."}
      </p>
    );
  }
  const activeCellsByDay = new Map(
    observedWeekState.observedWeek.days.map((day) => [
      day.dayOfYear,
      day.cells.length,
    ]),
  );
  const dailyCells = dayNumbers.map((day) => ({
    day,
    activeCells: activeCellsByDay.get(calendarDate(day).dayOfYear) ?? 0,
  }));
  const maximum = Math.max(1, ...dailyCells.map((entry) => entry.activeCells));

  return (
    <ol
      className="mt-4 flex h-24 items-end gap-1"
      aria-label="Active cells by day"
    >
      {dailyCells.map(({ day, activeCells }) => (
        <li key={day} className="flex h-full flex-1 flex-col justify-end gap-1">
          <span
            className="rounded-t bg-orange-500"
            style={{ height: `${(activeCells / maximum) * 100}%` }}
          />
          <span className="text-center text-[0.625rem] leading-none text-neutral-500">
            {day === dayNumbers[0]
              ? DAY_LABEL.format(new Date(isoDate(day)))
              : new Date(isoDate(day)).getUTCDate()}
          </span>
          <span className="sr-only">{activeCells} active cells</span>
        </li>
      ))}
    </ol>
  );
}
