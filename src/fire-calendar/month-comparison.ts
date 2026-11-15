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

export type MonthComparison = {
  cell: CalendarCell;
  value: number | null;
  typical: number | null;
  rank: MonthRank | null;
  baselineYears: number;
  throughDay: number | null;
};

export function closedMonthComparison(
  years: CalendarYear[],
  analysis: CalendarAnalysis,
): MonthComparison | null {
  const cells = years.flatMap((year) => year.cells);
  const partialIndex = cells.findIndex((cell) => cell.partial);
  const cell = cells[partialIndex - 1];
  if (!cell) {
    return null;
  }
  const baseline = analysis.baselines[cell.month - 1];
  return {
    cell,
    value: isMeasured(cell) ? cell.value : null,
    typical: baseline?.median ?? null,
    rank: monthRank(cell, years),
    baselineYears: baseline?.years ?? 0,
    throughDay: null,
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
  const baselineSums = years
    .filter((year) => year.year <= analysis.lastBaselineYear)
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
  };
}
