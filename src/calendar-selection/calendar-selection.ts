import { useSyncExternalStore } from "react";
import { addPeriodToSearch, type MapPeriod } from "@/fire-map/map-period";

export type CalendarSelection = {
  area: string | null;
  year: number | null;
  month: string | null;
  period: MapPeriod | null;
};

const STORAGE_KEY = "heru:selection";
const EMPTY: CalendarSelection = {
  area: null,
  year: null,
  month: null,
  period: null,
};
const listeners = new Set<() => void>();
let current: CalendarSelection | null = null;

function readStored(): CalendarSelection {
  try {
    const stored = JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<CalendarSelection> | null;
    return stored ? { ...EMPTY, ...stored } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function snapshot(): CalendarSelection {
  current ??= readStored();
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function rememberSelection(next: Partial<CalendarSelection>) {
  const previous = snapshot();
  const year = next.year ?? previous.year;
  const month =
    next.month !== undefined
      ? next.month
      : previous.month && year && previous.month.startsWith(String(year))
        ? previous.month
        : null;
  const merged: CalendarSelection = {
    area: next.area ?? previous.area,
    year,
    month,
    period: next.period !== undefined ? next.period : previous.period,
  };
  if (
    merged.area === previous.area &&
    merged.year === previous.year &&
    merged.month === previous.month &&
    JSON.stringify(merged.period) === JSON.stringify(previous.period)
  ) {
    return;
  }
  current = merged;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    current = merged;
  }
  for (const listener of listeners) {
    listener();
  }
}

export function useCalendarSelection(): CalendarSelection {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function anomaliesHref(selection: CalendarSelection): string {
  const params = new URLSearchParams();
  if (selection.area) params.set("area", selection.area);
  if (selection.year) params.set("year", String(selection.year));
  if (selection.month) params.set("month", selection.month);
  addPeriodToSearch(params, selection.period);
  const query = params.toString();
  return query ? `/anomalies?${query}` : "/anomalies";
}
