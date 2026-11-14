const MILLISECONDS_PER_DAY = 86_400_000;
const MILLISECONDS_PER_DEGREE_OF_LONGITUDE = MILLISECONDS_PER_DAY / 360;

export const DAYS_PER_WEEK = 7;
export const WEEKS_PER_YEAR = 52;

export type CalendarDate = {
  year: number;
  month: number;
  dayOfYear: number;
};

export function dayNumber(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`) / MILLISECONDS_PER_DAY;
}

export function solarDayNumber(acquiredAt: string, longitude: number): number {
  return Math.floor(
    (Date.parse(acquiredAt) +
      longitude * MILLISECONDS_PER_DEGREE_OF_LONGITUDE) /
      MILLISECONDS_PER_DAY,
  );
}

export function isoDate(day: number): string {
  return new Date(day * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

export function calendarDate(day: number): CalendarDate {
  const date = new Date(day * MILLISECONDS_PER_DAY);
  const year = date.getUTCFullYear();
  return {
    year,
    month: date.getUTCMonth() + 1,
    dayOfYear: day - firstDayOfYear(year) + 1,
  };
}

export function weekDays(year: number, week: number): number[] {
  const firstDay = firstDayOfYear(year) + (week - 1) * DAYS_PER_WEEK;
  const lastDay =
    week === WEEKS_PER_YEAR
      ? firstDayOfYear(year + 1) - 1
      : firstDay + DAYS_PER_WEEK - 1;
  return Array.from(
    { length: lastDay - firstDay + 1 },
    (_, offset) => firstDay + offset,
  );
}

function firstDayOfYear(year: number): number {
  return Date.UTC(year, 0, 1) / MILLISECONDS_PER_DAY;
}
