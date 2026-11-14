export type CoverageRow = {
  layer: string;
  processing: "sp" | "nrt";
  first_date: string;
  last_date: string;
  rows: number;
  updated_at: string;
};

export type LayerSpan = { first: string; last: string };

export type PipelineCoverage = {
  spans: Map<string, LayerSpan>;
  lastDataDate: string | null;
};

export function readCoverage(rows: CoverageRow[]): PipelineCoverage {
  const spans = new Map<string, LayerSpan>();
  for (const row of rows) {
    const span = spans.get(row.layer);
    spans.set(row.layer, {
      first: span && span.first < row.first_date ? span.first : row.first_date,
      last: span && span.last > row.last_date ? span.last : row.last_date,
    });
  }
  const noaa20NearRealTime = rows.find(
    (row) => row.layer === "viirs_noaa20" && row.processing === "nrt",
  );
  const lastDates = rows.map((row) => row.last_date).sort();
  return {
    spans,
    lastDataDate: noaa20NearRealTime?.last_date ?? lastDates.at(-1) ?? null,
  };
}
