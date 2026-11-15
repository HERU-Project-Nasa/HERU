import type { SeriesDayRow } from "@/pipeline/series-row";
import {
  type CalendarCell,
  type CalendarPasses,
  type CalendarSource,
  type CalendarYear,
  countColumn,
} from "./calendar-matrix";
import {
  type CalendarAnalysis,
  isMeasured,
  median,
  type MonthRank,
  monthRank,
  rankAmong,
} from "./calendar-statistics";

export type YearValue = { year: number; value: number | null };

export type MonthComparison = {
  cell: CalendarCell;
  value: number | null;
  typical: number | null;
  rank: MonthRank | null;
  baselineYears: number;
  throughDay: number | null;
  history: YearValue[];
};

export function comparedYears(
  years: CalendarYear[],
  analysis: CalendarAnalysis,
  cellYear: number,
): CalendarYear[] {
  return years.filter(
    (year) =>
      year.year === cellYear ||
      (year.year >= analysis.firstYear && year.year <= analysis.lastYear),
  );
}

export function closedMonthComparison(
  years: CalendarYear[],
  analysis: CalendarAnalysis,
): MonthComparison | null {
  const cells = years.flatMap((year) => year.cells);
  const partialIndex = cells.findIndex((cell) => cell.partial);
  const cell = cells[partialIndex - 1];
  return cell ? monthComparisonFor(cell, years, analysis) : null;
}

export function monthComparisonFor(
  cell: CalendarCell,
  years: CalendarYear[],
  analysis: CalendarAnalysis,
): MonthComparison {
  const baseline = analysis.baselines[cell.month - 1];
  const compared = comparedYears(years, analysis, cell.year);
  return {
    cell,
    value: isMeasured(cell) ? cell.value : null,
    typical: baseline?.median ?? null,
    rank: monthRank(cell, compared),
    baselineYears: baseline?.years ?? 0,
    throughDay: null,
    history: compared
      .filter((year) => year.year <= cell.year)
      .map((year) => {
        const same = year.cells[cell.month - 1];
        return { year: year.year, value: isMeasured(same) ? same.value : null };
      }),
  };
}

function sumThroughDay(
  rowsByDate: Map<string, SeriesDayRow>,
  cell: CalendarCell,
  column: ReturnType<typeof countColumn>,
  throughDay: number,
): number | null {
  let sum = 0;
  for (let day = 1; day <= throughDay; day++) {
    const value = rowsByDate.get(
      `${cell.key}-${String(day).padStart(2, "0")}`,
    )?.[column];
    if (value === null || value === undefined) {
      return null;
    }
    sum += value;
  }
  return sum;
}

export function currentMonthComparison(
  dailyRows: SeriesDayRow[],
  years: CalendarYear[],
  analysis: CalendarAnalysis,
  source: CalendarSource,
  passes: CalendarPasses,
  completeDate: string,
): MonthComparison | null {
  const cell = years.at(-1)?.cells.find((candidate) => candidate.partial);
  if (!cell || completeDate.slice(0, 7) !== cell.key) {
    return null;
  }
  const throughDay = Number(completeDate.slice(8, 10));
  const rowsByDate = new Map(dailyRows.map((row) => [row.date, row]));
  const sumFor = (other: CalendarCell) => {
    const column =
      source === "harmonized"
        ? countColumn("harmonized", passes)
        : other.layer && countColumn(other.layer, passes);
    return column ? sumThroughDay(rowsByDate, other, column, throughDay) : null;
  };
  const compared = comparedYears(years, analysis, cell.year);
  const baselineSums = compared
    .filter(
      (year) =>
        year.year >= analysis.firstYear &&
        year.year <= analysis.lastBaselineYear,
    )
    .flatMap((year) => {
      const sum = sumFor(year.cells[cell.month - 1]);
      return sum === null ? [] : [sum];
    });
  const value = sumFor(cell);
  return {
    cell,
    value,
    typical: median(baselineSums),
    rank: value === null ? null : rankAmong(value, [...baselineSums, value]),
    baselineYears: baselineSums.length,
    throughDay,
    history: compared.map((year) => ({
      year: year.year,
      value: sumFor(year.cells[cell.month - 1]),
    })),
  };
}

export type PeriodComparison = {
  start: string;
  end: string;
  startYear: number;
  value: number | null;
  typical: number | null;
  rank: MonthRank | null;
  baselineYears: number;
  history: YearValue[];
};

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function shiftYears(date: string, years: number): string | null {
  const year = Number(date.slice(0, 4)) + years;
  const rest = date.slice(4);
  return rest === "-02-29" && !isLeapYear(year) ? null : `${year}${rest}`;
}

export function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const day = new Date(`${start}T00:00:00Z`);
  for (let date = start; date <= end;) {
    dates.push(date);
    day.setUTCDate(day.getUTCDate() + 1);
    date = day.toISOString().slice(0, 10);
  }
  return dates;
}

export function dayValues(
  dailyRows: SeriesDayRow[],
  years: CalendarYear[],
  source: CalendarSource,
  passes: CalendarPasses,
  dates: string[],
): (number | null)[] {
  const rowsByDate = new Map(dailyRows.map((row) => [row.date, row]));
  const cellsByKey = new Map(
    years.flatMap((year) => year.cells.map((cell) => [cell.key, cell])),
  );
  return dates.map((date) => {
    const layer = cellsByKey.get(date.slice(0, 7))?.layer;
    const column =
      source === "harmonized"
        ? countColumn("harmonized", passes)
        : layer && countColumn(layer, passes);
    const value = column ? rowsByDate.get(date)?.[column] : null;
    return value ?? null;
  });
}

export function periodComparison(
  dailyRows: SeriesDayRow[],
  years: CalendarYear[],
  analysis: CalendarAnalysis,
  source: CalendarSource,
  passes: CalendarPasses,
  period: { start: string; end: string },
  completeDate: string,
): PeriodComparison | null {
  const end = period.end < completeDate ? period.end : completeDate;
  if (end < period.start) {
    return null;
  }
  const dates = datesBetween(period.start, end);
  const rowsByDate = new Map(dailyRows.map((row) => [row.date, row]));
  const cellsByKey = new Map(
    years.flatMap((year) => year.cells.map((cell) => [cell.key, cell])),
  );
  const sumShifted = (offset: number): number | null => {
    let total = 0;
    for (const date of dates) {
      const shifted = shiftYears(date, offset);
      if (shifted === null) {
        continue;
      }
      const layer = cellsByKey.get(shifted.slice(0, 7))?.layer;
      const column =
        source === "harmonized"
          ? countColumn("harmonized", passes)
          : layer && countColumn(layer, passes);
      const value = column ? rowsByDate.get(shifted)?.[column] : null;
      if (value === null || value === undefined) {
        return null;
      }
      total += value;
    }
    return total;
  };
  const startYear = Number(period.start.slice(0, 4));
  const history = comparedYears(years, analysis, startYear).map((year) => ({
    year: year.year,
    value: sumShifted(year.year - startYear),
  }));
  const value = history.find((point) => point.year === startYear)?.value;
  const baseline = history.flatMap((point) =>
    point.value !== null &&
    point.year >= analysis.firstYear &&
    point.year <= analysis.lastBaselineYear
      ? [point.value]
      : [],
  );
  const measured = history.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  return {
    start: period.start,
    end,
    startYear,
    value: value ?? null,
    typical: median(baseline),
    rank:
      value === null || value === undefined ? null : rankAmong(value, measured),
    baselineYears: baseline.length,
    history,
  };
}
