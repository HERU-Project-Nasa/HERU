import { useMemo } from "react";
import type { CountryRow } from "@/pipeline/pipeline-countries";
<<<<<<< HEAD
<<<<<<< HEAD
import { usePipelineFile } from "@/pipeline/pipeline-files";
=======
import { usePipelineFile, usePipelineFiles } from "@/pipeline/pipeline-files";
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
=======
import { usePipelineFile } from "@/pipeline/pipeline-files";
>>>>>>> 64dcc6316b354790f1c2374c891c435a06dbd88e
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

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 64dcc6316b354790f1c2374c891c435a06dbd88e
type CountryYearRow = SeriesYearRow & { iso3: string };

const COUNTRIES_YEARLY_PATH = "series/countries_yearly.csv";

<<<<<<< HEAD
=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
=======
>>>>>>> 64dcc6316b354790f1c2374c891c435a06dbd88e
export function useCountryYearTotals(
  countries: CountryRow[] | null,
  year: number | null,
): CountryYearTotals {
  const worldYears = usePipelineFile<SeriesYearRow>(
    seriesPath("yearly", WORLD_AREA),
  );
<<<<<<< HEAD
<<<<<<< HEAD
  const yearly = usePipelineFile<CountryYearRow>(COUNTRIES_YEARLY_PATH);
=======
  const paths = useMemo(
    () => countries?.map((country) => seriesPath("yearly", country.iso3)) ?? [],
    [countries],
  );
  const files = usePipelineFiles<SeriesYearRow>(paths);
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
=======
  const yearly = usePipelineFile<CountryYearRow>(COUNTRIES_YEARLY_PATH);
>>>>>>> 64dcc6316b354790f1c2374c891c435a06dbd88e
  const worldRow = worldYears.rows?.find((row) => row.year === year);
  const column: YearTotalColumn | null = !worldRow
    ? null
    : worldRow.harmonized !== null
      ? "harmonized"
      : "modis";

  return useMemo(() => {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 64dcc6316b354790f1c2374c891c435a06dbd88e
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
<<<<<<< HEAD
=======
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
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
=======
>>>>>>> 64dcc6316b354790f1c2374c891c435a06dbd88e
}
