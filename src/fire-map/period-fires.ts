import { type ChangedPaths, onPipelineChange } from "@/pipeline/pipeline-files";
import {
  PipelineFileError,
  parsePipelineCsv,
  readPipelineText,
} from "@/pipeline/read-pipeline-csv";
import type { SeriesLayer } from "@/pipeline/series-row";

export type FirePoint = {
  latitude: number;
  longitude: number;
  acquiredAt: string;
  layer: SeriesLayer;
  satellite: string;
  confidence: string;
  daynight: string;
  provisional: boolean;
};

export type FireCell = { latitude: number; longitude: number; count: number };

export type CellColumn = SeriesLayer | "harmonized";

export type FactorRow = { scope: string; id: string; k: string; k20: string };

type Factors = { k: number; k20: number };

export type BlockFactors = { world: Factors; blocks: Map<string, Factors> };

export function readBlockFactors(rows: FactorRow[]): BlockFactors | null {
  const world = rows.find((row) => row.scope === "world");
  if (!world || !Number(world.k) || !Number(world.k20)) {
    return null;
  }
  const worldFactors = { k: Number(world.k), k20: Number(world.k20) };
  return {
    world: worldFactors,
    blocks: new Map(
      rows
        .filter((row) => row.scope === "block")
        .map((row) => [
          row.id,
          {
            k: Number(row.k) || worldFactors.k,
            k20: Number(row.k20) || worldFactors.k20,
          },
        ]),
    ),
  };
}

export function blockId(latitude: number, longitude: number): string {
  return `${Math.floor(latitude / 5) * 5}_${Math.floor(longitude / 5) * 5}`;
}

export function harmonizedWeight(
  point: Pick<FirePoint, "latitude" | "longitude" | "layer">,
  factors: BlockFactors | null,
): number | null {
  if (point.layer === "viirs_snpp") {
    return 1;
  }
  if (!factors || (point.layer !== "modis" && point.layer !== "viirs_noaa20")) {
    return null;
  }
  const block =
    factors.blocks.get(blockId(point.latitude, point.longitude)) ??
    factors.world;
  return point.layer === "modis" ? block.k : block.k20;
}

export type AreaBounds = [
  west: number,
  south: number,
  east: number,
  north: number,
];

type PointRow = {
  latitude: number;
  longitude: number;
  acq_date: string;
  acq_time: string;
  layer: SeriesLayer;
  satellite: string;
  country: string;
  daynight: string;
  confidence: string;
  type: number | null;
  processing: string;
};

const STATIC_SOURCES_PATH = "meta/static_sources.csv";

const dayPoints = new Map<string, Promise<FirePoint[] | null>>();
const monthCells = new Map<string, Promise<FireCell[] | null>>();

let staticSources: Promise<Set<string>> | null = null;

function forgetChanged(cache: Map<string, unknown>, paths: ChangedPaths) {
  for (const key of [...cache.keys()]) {
    if (!paths || paths.has(key.split("|")[0])) {
      cache.delete(key);
    }
  }
}

onPipelineChange((paths) => {
  if (!paths || paths.has(STATIC_SOURCES_PATH)) {
    staticSources = null;
    dayPoints.clear();
  }
  forgetChanged(dayPoints, paths);
  forgetChanged(monthCells, paths);
});

function staticKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

export function readStaticSources(text: string): Set<string> {
  return new Set(
    text
      .split("\n")
      .slice(1)
      .filter((line) => line.includes(","))
      .map((line) => {
        const [latitude, longitude] = line.split(",").map(Number);
        return staticKey(latitude, longitude);
      }),
  );
}

export function countedInSeries(
  row: Pick<PointRow, "latitude" | "longitude" | "type">,
  staticSources: Set<string> | null,
): boolean {
  if (row.type !== null) {
    return row.type === 0;
  }
  return !staticSources?.has(
    staticKey(
      Math.floor(row.latitude * 100) / 100,
      Math.floor(row.longitude * 100) / 100,
    ),
  );
}

function loadStaticSources(): Promise<Set<string>> {
  staticSources ??=
    readPipelineText(STATIC_SOURCES_PATH).then(readStaticSources);
  staticSources.catch(() => {
    staticSources = null;
  });
  return staticSources;
}

function missingIsNull<T>(error: unknown): T | null {
  if (error instanceof PipelineFileError && error.status === 404) {
    return null;
  }
  throw error;
}

export function loadDayPoints(
  layer: SeriesLayer,
  date: string,
  area: string | null,
): Promise<FirePoint[] | null> {
  const path = `points/${layer}/${date.slice(0, 4)}/${date}.csv.gz`;
  const key = `${path}|${area ?? ""}`;
  let request = dayPoints.get(key);
  if (!request) {
    request = readPipelineText(path).then(
      async (text) => {
        const lines = text.split("\n");
        const marker = `,${area},`;
        const kept = area
          ? [
              lines[0],
              ...lines.slice(1).filter((line) => line.includes(marker)),
            ]
          : lines;
        const rows = parsePipelineCsv<PointRow>(kept.join("\n")).filter(
          (row) => !area || row.country === area,
        );
        const mask = rows.some((row) => row.type === null)
          ? await loadStaticSources()
          : null;
        return rows
          .filter((row) => countedInSeries(row, mask))
          .map((row) => ({
            latitude: row.latitude,
            longitude: row.longitude,
            acquiredAt: `${row.acq_date}T${row.acq_time.slice(0, 2)}:${row.acq_time.slice(2, 4)}:00Z`,
            layer: row.layer,
            satellite: row.satellite,
            confidence: row.confidence,
            daynight: row.daynight,
            provisional: row.processing.toLowerCase() === "nrt",
          }));
      },
      missingIsNull<FirePoint[]>,
    );
    request.catch(() => dayPoints.delete(key));
    dayPoints.set(key, request);
  }
  return request;
}

export function loadMonthCells(
  month: string,
  column: CellColumn,
  bounds: AreaBounds | null,
): Promise<FireCell[] | null> {
  const path = `grid/monthly/${month.slice(0, 4)}/${month}.csv`;
  const key = `${path}|${column}|${bounds?.join(",") ?? ""}`;
  let request = monthCells.get(key);
  if (!request) {
    request = readPipelineText(path).then(
      (text) => {
        const lines = text.split("\n");
        const header = lines[0].trim().split(",");
        const latitudeIndex = header.indexOf("cell_lat");
        const longitudeIndex = header.indexOf("cell_lon");
        const countIndex = header.indexOf(column);
        const cells: FireCell[] = [];
        for (const line of lines.slice(1)) {
          const parts = line.split(",");
          const count = Number(parts[countIndex]);
          if (!(count > 0)) {
            continue;
          }
          const latitude = Number(parts[latitudeIndex]);
          const longitude = Number(parts[longitudeIndex]);
          if (
            bounds &&
            (longitude < bounds[0] ||
              longitude > bounds[2] ||
              latitude < bounds[1] ||
              latitude > bounds[3])
          ) {
            continue;
          }
          cells.push({ latitude, longitude, count });
        }
        return cells;
      },
      missingIsNull<FireCell[]>,
    );
    request.catch(() => monthCells.delete(key));
    monthCells.set(key, request);
  }
  return request;
}
