import type { Sensor } from "../firms/sensor.ts";
import type { ObservedPeriod } from "./active-cells.ts";
import { dayNumber, isoDate } from "./calendar-day.ts";

export const FIRST_CALENDAR_YEAR = 2003;
export const REFERENCE_SENSOR: Sensor = "viirs-snpp";

const MISSING_DATA_TOLERANCE_DAYS = 31;

export type SeriesPeriod = {
  sensor: Sensor;
  firstDay: number;
  lastDay: number;
  calibrationWindow: [firstDay: number, lastDay: number] | null;
};

export const SERIES_PERIODS: SeriesPeriod[] = [
  {
    sensor: "modis-aqua",
    firstDay: dayNumber(`${FIRST_CALENDAR_YEAR}-01-01`),
    lastDay: dayNumber("2012-01-19"),
    calibrationWindow: [dayNumber("2012-01-20"), dayNumber("2021-12-31")],
  },
  {
    sensor: REFERENCE_SENSOR,
    firstDay: dayNumber("2012-01-20"),
    lastDay: dayNumber("2026-11-01"),
    calibrationWindow: null,
  },
  {
    sensor: "viirs-noaa20",
    firstDay: dayNumber("2026-11-02"),
    lastDay: Infinity,
    calibrationWindow: [dayNumber("2019-01-01"), dayNumber("2025-12-31")],
  },
];

export function coveredSeriesPeriods(
  observedPeriods: Map<Sensor, ObservedPeriod>,
): SeriesPeriod[] {
  const coveredPeriods: SeriesPeriod[] = [];
  for (const period of SERIES_PERIODS) {
    const observed = observedPeriods.get(period.sensor);
    if (!observed || observed.lastDay < period.firstDay) {
      break;
    }
    if (observed.firstDay > period.firstDay + MISSING_DATA_TOLERANCE_DAYS) {
      throw new Error(
        `${period.sensor} data starts on ${isoDate(observed.firstDay)}, after ${isoDate(period.firstDay)}`,
      );
    }
    coveredPeriods.push({
      ...period,
      lastDay: Math.min(period.lastDay, observed.lastDay),
    });
    if (observed.lastDay < period.lastDay) {
      break;
    }
  }
  if (coveredPeriods.length === 0) {
    throw new Error(
      `No ${SERIES_PERIODS[0].sensor} data from ${isoDate(SERIES_PERIODS[0].firstDay)}`,
    );
  }
  return coveredPeriods;
}

export function periodWithMostDays(days: number[]): SeriesPeriod {
  const daysInPeriod = (period: SeriesPeriod) =>
    days.filter((day) => day >= period.firstDay && day <= period.lastDay)
      .length;
  return SERIES_PERIODS.reduce((best, period) =>
    daysInPeriod(period) > daysInPeriod(best) ? period : best,
  );
}
