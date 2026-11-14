import { useEffect, useMemo, useState } from "react";
import { calendarDate, weekDays } from "@/harmonization/calendar-day";
import type {
  CalendarGrid,
  CalendarWeek,
  FireCalendar,
  ObservedDay,
  ObservedYear,
} from "@/harmonization/fire-calendar";

export type WeekCell = {
  bounds: [west: number, south: number, east: number, north: number];
  activeDays: number;
};

export type ObservedWeek = {
  days: ObservedDay[];
  cells: WeekCell[];
};

export type ObservedWeekState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; observedWeek: ObservedWeek };

const observedYearRequests = new Map<string, Promise<ObservedYear>>();

export function useObservedWeek(
  calendar: FireCalendar | null,
  week: CalendarWeek | null,
): ObservedWeekState {
  const requestKey =
    calendar && week ? `${calendar.regionId}/${week.year}` : null;
  const [loaded, setLoaded] = useState<{
    requestKey: string;
    observedYear: ObservedYear | null;
  } | null>(null);

  useEffect(() => {
    if (requestKey === null) {
      return;
    }
    let current = true;
    loadObservedYear(requestKey).then(
      (observedYear) => {
        if (current) {
          setLoaded({ requestKey, observedYear });
        }
      },
      () => {
        if (current) {
          setLoaded({ requestKey, observedYear: null });
        }
      },
    );
    return () => {
      current = false;
    };
  }, [requestKey]);

  const observedYear =
    loaded && loaded.requestKey === requestKey
      ? loaded.observedYear
      : undefined;
  const grid = calendar?.grid;
  const weekNumber = week?.week;
  const observedWeek = useMemo(
    () =>
      observedYear && grid && weekNumber !== undefined
        ? selectObservedWeek(observedYear, weekNumber, grid)
        : null,
    [observedYear, weekNumber, grid],
  );

  if (requestKey === null) {
    return { status: "idle" };
  }
  if (observedYear === undefined) {
    return { status: "loading" };
  }
  if (!observedWeek) {
    return { status: "unavailable" };
  }
  return { status: "ready", observedWeek };
}

function loadObservedYear(requestKey: string): Promise<ObservedYear> {
  const pending = observedYearRequests.get(requestKey);
  if (pending) {
    return pending;
  }
  const request = fetch(`/cells/${requestKey}.json`).then((response) => {
    if (!response.ok) {
      throw new Error(`Cannot load the cells of ${requestKey}`);
    }
    return response.json() as Promise<ObservedYear>;
  });
  request.catch(() => observedYearRequests.delete(requestKey));
  observedYearRequests.set(requestKey, request);
  return request;
}

function selectObservedWeek(
  observedYear: ObservedYear,
  week: number,
  grid: CalendarGrid,
): ObservedWeek {
  const daysOfYear = new Set(
    weekDays(observedYear.year, week).map((day) => calendarDate(day).dayOfYear),
  );
  const days = observedYear.days.filter((day) => daysOfYear.has(day.dayOfYear));
  const cellsByPosition = new Map<string, WeekCell>();
  for (const day of days) {
    for (const [column, row] of day.cells) {
      const position = `${column}:${row}`;
      const west = grid.west + column * grid.step;
      const south = grid.south + row * grid.step;
      const cell = cellsByPosition.get(position) ?? {
        bounds: [west, south, west + grid.step, south + grid.step],
        activeDays: 0,
      };
      cell.activeDays++;
      cellsByPosition.set(position, cell);
    }
  }
  return { days, cells: [...cellsByPosition.values()] };
}
