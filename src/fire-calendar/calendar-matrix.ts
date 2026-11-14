import type { PipelineCoverage } from "@/pipeline/pipeline-coverage";
import type {
  SeriesColumn,
  SeriesCountColumn,
  SeriesLayer,
  SeriesMonthRow,
} from "@/pipeline/series-row";

export const CALENDAR_FIRST_YEAR = 2003;
export const VIIRS_FIRST_MONTH = "2012-01";

export type CalendarSource = "harmonized" | "modis" | "viirs";

export type CalendarPasses = "all" | "day" | "night";

export type CellState =
  "value" | "zero" | "no-data" | "computing" | "loading" | "future";

export type CellOrigin =
  | "modis_x_k"
  | "viirs_snpp_observed"
  | "viirs_noaa20_x_k20"
  | "modis_raw"
  | "viirs_snpp_raw"
  | "viirs_noaa20_raw";

export type CalendarCell = {
  year: number;
  month: number;
  key: string;
  value: number | null;
  state: CellState;
  partial: boolean;
  provisional: boolean;
  layer: SeriesLayer | null;
  origin: CellOrigin | null;
};

export type CalendarYear = {
  year: number;
  cells: CalendarCell[];
  sensor: "modis" | "viirs" | null;
};

type MonthFeed = { layer: SeriesLayer; origin: CellOrigin };

const PASS_SUFFIX = { all: "", day: "_d", night: "_n" } as const;

const HARMONIZED_FEEDS: Record<string, MonthFeed> = {
  modis_x_k: { layer: "modis", origin: "modis_x_k" },
  viirs_snpp: { layer: "viirs_snpp", origin: "viirs_snpp_observed" },
  viirs_noaa20_x_k20: { layer: "viirs_noaa20", origin: "viirs_noaa20_x_k20" },
};

const HARMONIZED_FEED_BY_LAYER: Partial<Record<SeriesLayer, MonthFeed>> = {
  modis: HARMONIZED_FEEDS.modis_x_k,
  viirs_snpp: HARMONIZED_FEEDS.viirs_snpp,
  viirs_noaa20: HARMONIZED_FEEDS.viirs_noaa20_x_k20,
};

export function countColumn(
  column: SeriesColumn,
  passes: CalendarPasses,
): SeriesCountColumn {
  return `${column}${PASS_SUFFIX[passes]}`;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function lastDayOfMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${key}-${String(day).padStart(2, "0")}`;
}

function isCovered(
  coverage: PipelineCoverage,
  layer: SeriesLayer,
  key: string,
): boolean {
  const span = coverage.spans.get(layer);
  return (
    span !== undefined &&
    `${key}-01` <= span.last &&
    lastDayOfMonth(key) >= span.first
  );
}

export function viirsLayerFor(
  key: string,
  coverage: PipelineCoverage,
): "viirs_snpp" | "viirs_noaa20" | null {
  if (key < VIIRS_FIRST_MONTH) {
    return null;
  }
  const snpp = coverage.spans.get("viirs_snpp");
  if (snpp) {
    const stillObserving =
      coverage.lastDataDate !== null && snpp.last >= coverage.lastDataDate;
    return stillObserving || lastDayOfMonth(key) <= snpp.last
      ? "viirs_snpp"
      : "viirs_noaa20";
  }
  const noaa20 = coverage.spans.get("viirs_noaa20");
  return noaa20 && `${key}-01` >= noaa20.first ? "viirs_noaa20" : "viirs_snpp";
}

function feedFor(
  key: string,
  row: SeriesMonthRow | undefined,
  source: CalendarSource,
  coverage: PipelineCoverage,
): MonthFeed | null {
  if (source === "modis") {
    return { layer: "modis", origin: "modis_raw" };
  }
  if (source === "harmonized") {
    const declared = row?.harmonized_source
      ? HARMONIZED_FEEDS[row.harmonized_source]
      : undefined;
    const layer =
      key < VIIRS_FIRST_MONTH ? "modis" : viirsLayerFor(key, coverage)!;
    return declared ?? HARMONIZED_FEED_BY_LAYER[layer] ?? null;
  }
  const layer = viirsLayerFor(key, coverage);
  if (layer === null) {
    return null;
  }
  return {
    layer,
    origin: layer === "viirs_snpp" ? "viirs_snpp_raw" : "viirs_noaa20_raw",
  };
}

function buildCell(
  year: number,
  month: number,
  row: SeriesMonthRow | undefined,
  coverage: PipelineCoverage,
  source: CalendarSource,
  passes: CalendarPasses,
): CalendarCell {
  const key = monthKey(year, month);
  const lastMonth = coverage.lastDataDate?.slice(0, 7) ?? "";
  const cell: CalendarCell = {
    year,
    month,
    key,
    value: null,
    state: "future",
    partial: key === lastMonth,
    provisional: row?.provisional === 1,
    layer: null,
    origin: null,
  };
  if (key > lastMonth) {
    return { ...cell, partial: false };
  }
  const feed = feedFor(key, row, source, coverage);
  if (!feed) {
    return { ...cell, state: "no-data" };
  }
  const withFeed = { ...cell, layer: feed.layer, origin: feed.origin };
  if (!row) {
    return isCovered(coverage, feed.layer, key)
      ? { ...withFeed, value: 0, state: "zero" }
      : { ...withFeed, state: "loading" };
  }
  const value =
    row[
      countColumn(source === "harmonized" ? "harmonized" : feed.layer, passes)
    ];
  if (value === null) {
    if (!isCovered(coverage, feed.layer, key)) {
      return { ...withFeed, state: "loading" };
    }
    if (
      source === "harmonized" &&
      row[countColumn(feed.layer, passes)] !== null
    ) {
      return { ...withFeed, state: "computing" };
    }
    return { ...withFeed, state: "no-data" };
  }
  return { ...withFeed, value, state: value === 0 ? "zero" : "value" };
}

function yearSensor(cells: CalendarCell[]): CalendarYear["sensor"] {
  const layers = cells.flatMap((cell) => (cell.layer ? [cell.layer] : []));
  if (layers.length === 0) {
    return null;
  }
  const modisMonths = layers.filter((layer) => layer === "modis").length;
  return modisMonths * 2 > layers.length ? "modis" : "viirs";
}

export function buildCalendarYears(
  rows: SeriesMonthRow[],
  coverage: PipelineCoverage,
  source: CalendarSource,
  passes: CalendarPasses,
): CalendarYear[] {
  if (coverage.lastDataDate === null) {
    return [];
  }
  const rowsByMonth = new Map(rows.map((row) => [row.month, row]));
  const lastYear = Number(coverage.lastDataDate.slice(0, 4));
  const years: CalendarYear[] = [];
  for (let year = CALENDAR_FIRST_YEAR; year <= lastYear; year++) {
    const cells = Array.from({ length: 12 }, (_, index) =>
      buildCell(
        year,
        index + 1,
        rowsByMonth.get(monthKey(year, index + 1)),
        coverage,
        source,
        passes,
      ),
    );
    years.push({ year, cells, sensor: yearSensor(cells) });
  }
  return years;
}

export function hasHarmonizedValues(rows: SeriesMonthRow[]): boolean {
  return rows.some((row) => row.harmonized !== null);
}
