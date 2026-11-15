import Papa from "papaparse";
import { PASS_SUFFIXES, SERIES_LAYERS } from "./series-row";

export const PIPELINE_BASE = process.env.NEXT_PUBLIC_HERU_BASE ?? "/v1/";

const NUMERIC_COLUMNS = new Set([
  ...[...SERIES_LAYERS, "harmonized"].flatMap((column) =>
    PASS_SUFFIXES.map((suffix) => `${column}${suffix}`),
  ),
  "provisional",
  "rows",
  "bytes",
  "batch",
  "year",
  "latitude",
  "longitude",
  "frp",
  "type",
  "cell_lat",
  "cell_lon",
  "area_km2",
  "modis_x_k",
]);

export class PipelineFileError extends Error {
  readonly status: number;

  constructor(status: number, path: string) {
    super(`${status} ${path}`);
    this.status = status;
  }
}

export async function readPipelineText(path: string): Promise<string> {
  const response = await fetch(PIPELINE_BASE + path, { cache: "no-cache" });
  if (!response.ok) {
    throw new PipelineFileError(response.status, path);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).text();
  }
  return new TextDecoder().decode(bytes);
}

export async function readPipelineCsv<T>(path: string): Promise<T[]> {
  return parsePipelineCsv<T>(await readPipelineText(path));
}

export function parsePipelineCsv<T>(text: string): T[] {
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return data.map((row) => {
    const parsed: Record<string, unknown> = {};
    for (const [column, text] of Object.entries(row)) {
      parsed[column] = NUMERIC_COLUMNS.has(column)
        ? text === ""
          ? null
          : Number(text)
        : text;
    }
    return parsed as T;
  });
}
