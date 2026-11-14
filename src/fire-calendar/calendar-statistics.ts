import {
  CALENDAR_FIRST_YEAR,
  type CalendarCell,
  type CalendarYear,
} from "./calendar-matrix";

export type MonthBaseline = {
  years: number;
  median: number;
  mean: number;
  p25: number;
  p75: number;
  p90: number;
};

export type CriticalSeason = { months: number[]; share: number };

export type YearTotal = {
  total: number | null;
  complete: boolean;
  partial: boolean;
};

export type RecordYear = { year: number; total: number; ratio: number };

export type MonthRank = { rank: number; of: number };

export type CalendarAnalysis = {
  lastBaselineYear: number;
  baselineYearCount: number;
  baselines: (MonthBaseline | null)[];
  breaks: number[];
  season: CriticalSeason | null;
  totals: Map<number, YearTotal>;
  largestTotal: number;
  record: RecordYear | null;
  outliers: CalendarCell[];
};

const SEASON_SHARE = 0.75;
const OUTLIER_MINIMUM = 20;

export function isMeasured(cell: CalendarCell): boolean {
  return cell.state === "value" || cell.state === "zero";
}

export function quantile(sorted: number[], q: number): number {
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function median(values: number[]): number | null {
  return values.length
    ? quantile(
        [...values].sort((a, b) => a - b),
        0.5,
      )
    : null;
}

export function monthBaselines(
  years: CalendarYear[],
  lastBaselineYear: number,
): (MonthBaseline | null)[] {
  return Array.from({ length: 12 }, (_, index) => {
    const values = years
      .filter((year) => year.year <= lastBaselineYear)
      .map((year) => year.cells[index])
      .filter(isMeasured)
      .map((cell) => cell.value!)
      .sort((a, b) => a - b);
    if (values.length === 0) {
      return null;
    }
    return {
      years: values.length,
      median: quantile(values, 0.5),
      mean: values.reduce((sum, value) => sum + value, 0) / values.length,
      p25: quantile(values, 0.25),
      p75: quantile(values, 0.75),
      p90: quantile(values, 0.9),
    };
  });
}

function nice(value: number): number {
  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  return (fraction < 1.7 ? 1 : fraction < 5.5 ? 3 : 10) * power;
}

function nextNice(value: number): number {
  const power = 10 ** Math.floor(Math.log10(value));
  return value / power < 3 ? 3 * power : 10 * power;
}

export function logBreaks(values: number[]): number[] {
  const positive = values.filter((value) => value > 0);
  if (new Set(positive).size < 2) {
    return [];
  }
  const low = Math.log(Math.max(1, Math.min(...positive)));
  const high = Math.log(Math.max(...positive));
  const breaks: number[] = [];
  for (let step = 1; step <= 5; step++) {
    let limit = nice(Math.exp(low + (step * (high - low)) / 6));
    if (breaks.length && limit <= breaks[breaks.length - 1]) {
      limit = nextNice(breaks[breaks.length - 1]);
    }
    breaks.push(limit);
  }
  return breaks;
}

export function heatLevel(value: number, breaks: number[]): number {
  if (breaks.length === 0) {
    return 4;
  }
  return 1 + breaks.filter((limit) => value >= limit).length;
}

export function isOutlier(
  cell: CalendarCell,
  baseline: MonthBaseline | null,
  monthEnabled: boolean,
): boolean {
  return (
    monthEnabled &&
    !cell.partial &&
    cell.state === "value" &&
    baseline !== null &&
    cell.value! > baseline.p90 &&
    cell.value! >= 2 * baseline.median &&
    cell.value! >= OUTLIER_MINIMUM
  );
}

export function criticalSeason(
  baselines: (MonthBaseline | null)[],
): CriticalSeason | null {
  if (baselines.some((baseline) => baseline === null)) {
    return null;
  }
  const medians = baselines.map((baseline) => baseline!.median);
  const total = medians.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return null;
  }
  for (let length = 1; length <= 12; length++) {
    let best: { start: number; sum: number } | null = null;
    for (let start = 0; start < 12; start++) {
      let sum = 0;
      for (let offset = 0; offset < length; offset++) {
        sum += medians[(start + offset) % 12];
      }
      if (sum >= SEASON_SHARE * total && (!best || sum > best.sum)) {
        best = { start, sum };
      }
    }
    if (best) {
      const { start, sum } = best;
      return {
        months: Array.from({ length }, (_, offset) => (start + offset) % 12),
        share: sum / total,
      };
    }
  }
  return null;
}

export function yearTotal(
  year: CalendarYear,
  enabledMonths: boolean[],
): YearTotal {
  const cells = year.cells.filter(
    (cell, index) => enabledMonths[index] && cell.state !== "future",
  );
  const measured = cells.filter(isMeasured);
  return {
    total: measured.length
      ? measured.reduce((sum, cell) => sum + cell.value!, 0)
      : null,
    complete:
      measured.length === cells.length && !cells.some((cell) => cell.partial),
    partial: year.cells.some((cell) => cell.partial),
  };
}

export function monthRank(
  cell: CalendarCell,
  years: CalendarYear[],
): MonthRank | null {
  if (!isMeasured(cell) || cell.partial) {
    return null;
  }
  const values = years
    .map((year) => year.cells[cell.month - 1])
    .filter((other) => isMeasured(other) && !other.partial)
    .map((other) => other.value!);
  return {
    rank: 1 + values.filter((value) => value > cell.value!).length,
    of: values.length,
  };
}

export function rankAmong(value: number, values: number[]): MonthRank {
  return {
    rank: 1 + values.filter((other) => other > value).length,
    of: values.length,
  };
}

export function analyzeCalendar(
  years: CalendarYear[],
  visibleYears: CalendarYear[],
  enabledMonths: boolean[],
): CalendarAnalysis {
  const lastBaselineYear = (years.at(-1)?.year ?? CALENDAR_FIRST_YEAR) - 1;
  const baselines = monthBaselines(years, lastBaselineYear);
  const breaks = logBreaks(
    visibleYears.flatMap((year) =>
      year.cells
        .filter((cell) => cell.state === "value" && !cell.partial)
        .map((cell) => cell.value!),
    ),
  );
  const totals = new Map(
    years.map((year) => [year.year, yearTotal(year, enabledMonths)]),
  );
  const baselineTotals = years
    .filter((year) => year.year <= lastBaselineYear)
    .flatMap((year) => {
      const total = totals.get(year.year)!;
      return total.complete && total.total !== null
        ? [{ year: year.year, total: total.total }]
        : [];
    });
  const typicalTotal = median(baselineTotals.map((entry) => entry.total));
  const best = baselineTotals.reduce<{ year: number; total: number } | null>(
    (current, entry) =>
      !current || entry.total > current.total ? entry : current,
    null,
  );
  const visibleTotals = visibleYears.map(
    (year) => totals.get(year.year)?.total ?? 0,
  );
  return {
    lastBaselineYear,
    baselineYearCount: lastBaselineYear - CALENDAR_FIRST_YEAR + 1,
    baselines,
    breaks,
    season: criticalSeason(baselines),
    totals,
    largestTotal: Math.max(0, ...visibleTotals),
    record:
      best && typicalTotal
        ? { ...best, ratio: best.total / typicalTotal }
        : null,
    outliers: years.flatMap((year) =>
      year.cells.filter((cell, index) =>
        isOutlier(cell, baselines[index], enabledMonths[index]),
      ),
    ),
  };
}
