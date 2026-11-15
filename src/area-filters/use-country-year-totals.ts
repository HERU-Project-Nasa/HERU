import { useMemo } from "react";
import type { CountryRow } from "@/pipeline/pipeline-countries";
import { usePipelineFile } from "@/pipeline/pipeline-files";
import {
  type SeriesYearRow,
  seriesPath,
  WORLD_AREA,
} from "@/pipeline/series-row";

export type YearTotalColumn = "harmonized" | "modis";

export type CountryYearTotals = {
  column: YearTotalColumn | null;
  totals: Map<string, number | null>;
  pending: number;
};

type CountryYearRow = SeriesYearRow & { iso3: string };

const COUNTRIES_YEARLY_PATH = "series/countries_yearly.csv";

export function useCountryYearTotals(
  countries: CountryRow[] | null,
  year: number | null,
): CountryYearTotals {
  const worldYears = usePipelineFile<SeriesYearRow>(
    seriesPath("yearly", WORLD_AREA),
  );
  const yearly = usePipelineFile<CountryYearRow>(COUNTRIES_YEARLY_PATH);
  const worldRow = worldYears.rows?.find((row) => row.year === year);
  const column: YearTotalColumn | null = !worldRow
    ? null
    : worldRow.harmonized !== null
      ? "harmonized"
      : "modis";

  return useMemo(() => {
    const rowsOfYear = new Map(
      (yearly.rows ?? [])
        .filter((row) => row.year === year)
        .map((row) => [row.iso3, row]),
    );
    const totals = new Map<string, number | null>();
    for (const country of countries ?? []) {
      const row = rowsOfYear.get(country.iso3);
      totals.set(country.iso3, column && row ? (row[column] ?? null) : null);
    }
    const pending = yearly.rows || yearly.error ? 0 : (countries?.length ?? 0);
    return { column, totals, pending };
  }, [yearly.rows, yearly.error, countries, year, column]);
}
