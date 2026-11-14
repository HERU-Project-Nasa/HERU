export const SERIES_LAYERS = [
  "modis",
  "viirs_snpp",
  "viirs_noaa20",
  "viirs_noaa21",
  "landsat",
] as const;

export type SeriesLayer = (typeof SERIES_LAYERS)[number];

export type SeriesColumn = SeriesLayer | "harmonized";

export const PASS_SUFFIXES = ["", "_d", "_n"] as const;

export type SeriesCountColumn =
  `${SeriesColumn}${(typeof PASS_SUFFIXES)[number]}`;

export type HarmonizedSource =
  "modis_x_k" | "viirs_snpp" | "viirs_noaa20_x_k20" | "";

export type SeriesCounts = Record<SeriesCountColumn, number | null> & {
  harmonized_source: HarmonizedSource;
  provisional: number | null;
};

export type SeriesMonthRow = SeriesCounts & { month: string };

export type SeriesDayRow = SeriesCounts & { date: string };

export type SeriesYearRow = SeriesCounts & { year: number };

export const WORLD_AREA = "world";

export function seriesPath(
  scale: "daily" | "monthly" | "yearly",
  area: string,
): string {
  return area === WORLD_AREA
    ? `series/global/${scale}.csv`
    : `series/countries/${area}/${scale}.csv`;
}
