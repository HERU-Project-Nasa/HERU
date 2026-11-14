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
};

export type FireCell = { latitude: number; longitude: number; count: number };

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
};

const dayPoints = new Map<string, Promise<FirePoint[] | null>>();
const monthCells = new Map<string, Promise<FireCell[] | null>>();

let staticSources: Promise<Set<string>> | null = null;

function staticKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

function loadStaticSources(): Promise<Set<string>> {
  staticSources ??= readPipelineText("meta/static_sources.csv").then(
    (text) =>
      new Set(
        text
          .split("\n")
          .slice(1)
          .filter((line) => line.includes(","))
          .map((line) => {
            const [latitude, longitude] = line.split(",").map(Number);
            return staticKey(latitude, longitude);
          }),
      ),
  );
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
    request = Promise.all([
      readPipelineText(path),
      layer === "modis" ? null : loadStaticSources(),
    ]).then(
      ([text, staticSources]) => {
        const lines = text.split("\n");
        const marker = `,${area},`;
        const kept = area
          ? [
              lines[0],
              ...lines.slice(1).filter((line) => line.includes(marker)),
            ]
          : lines;
        return parsePipelineCsv<PointRow>(kept.join("\n"))
          .filter(
            (row) =>
              (!area || row.country === area) &&
              (row.layer !== "modis" || row.type === 0) &&
              !staticSources?.has(
                staticKey(
                  Math.floor(row.latitude * 100) / 100,
                  Math.floor(row.longitude * 100) / 100,
                ),
              ),
          )
          .map((row) => ({
            latitude: row.latitude,
            longitude: row.longitude,
            acquiredAt: `${row.acq_date}T${row.acq_time.slice(0, 2)}:${row.acq_time.slice(2, 4)}:00Z`,
            layer: row.layer,
            satellite: row.satellite,
            confidence: row.confidence,
            daynight: row.daynight,
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
  column: SeriesLayer,
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
