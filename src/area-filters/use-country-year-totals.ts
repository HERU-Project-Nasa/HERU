import { useMemo } from "react";
import type { CountryRow } from "@/pipeline/pipeline-countries";
import { usePipelineFile, usePipelineFiles } from "@/pipeline/pipeline-files";
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

export function useCountryYearTotals(
  countries: CountryRow[] | null,
  year: number | null,
): CountryYearTotals {
  const worldYears = usePipelineFile<SeriesYearRow>(
    seriesPath("yearly", WORLD_AREA),
  );
  const paths = useMemo(
    () => countries?.map((country) => seriesPath("yearly", country.iso3)) ?? [],
    [countries],
  );
  const files = usePipelineFiles<SeriesYearRow>(paths);
  const worldRow = worldYears.rows?.find((row) => row.year === year);
  const column: YearTotalColumn | null = !worldRow
    ? null
    : worldRow.harmonized !== null
      ? "harmonized"
      : "modis";

  return useMemo(() => {
    const totals = new Map<string, number | null>();
    let pending = 0;
    files.forEach((file, index) => {
      if (!file.rows && !file.error) {
        pending++;
      }
      const row = file.rows?.find((candidate) => candidate.year === year);
      totals.set(
        countries![index].iso3,
        column && row ? (row[column] ?? null) : null,
      );
    });
    return { column, totals, pending };
  }, [files, countries, year, column]);
}
