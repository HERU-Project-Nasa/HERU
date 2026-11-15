export type CoverageRow = {
  layer: string;
  processing: "sp" | "nrt";
  first_date: string;
  last_date: string;
  rows: number;
  updated_at: string;
  complete_date?: string;
};

export type LayerSpan = { first: string; last: string };

export type PipelineCoverage = {
  spans: Map<string, LayerSpan>;
  lastDataDate: string | null;
  completeDate: string | null;
  completeDateFromPipeline: boolean;
};

function dayBefore(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

export function readCoverage(rows: CoverageRow[]): PipelineCoverage {
  const spans = new Map<string, LayerSpan>();
  for (const row of rows) {
    const span = spans.get(row.layer);
    spans.set(row.layer, {
      first: span && span.first < row.first_date ? span.first : row.first_date,
      last: span && span.last > row.last_date ? span.last : row.last_date,
    });
  }
  const reference =
    rows.find(
      (row) => row.layer === "viirs_noaa20" && row.processing === "nrt",
    ) ??
    [...rows].sort((a, b) => a.last_date.localeCompare(b.last_date)).at(-1);
  const lastDataDate = reference?.last_date ?? null;
  const declared = reference?.complete_date || null;
  return {
    spans,
    lastDataDate,
    completeDate: declared ?? (lastDataDate ? dayBefore(lastDataDate) : null),
    completeDateFromPipeline: declared !== null,
  };
}
