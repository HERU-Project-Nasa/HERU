import { useEffect, useState } from "react";
import {
  insideShape,
  loadCountryShape,
} from "@/country-outlines/country-outlines";
import type { PipelineCoverage } from "@/pipeline/pipeline-coverage";
import { usePipelineRevision } from "@/pipeline/pipeline-files";
import type { SeriesLayer } from "@/pipeline/series-row";
import {
  layerForMonth,
  type MapPeriod,
  periodDates,
  periodMonths,
} from "./map-period";
import {
  type AreaBounds,
  type FireCell,
  type FirePoint,
  loadDayPoints,
  loadMonthCells,
} from "./period-fires";

export type MappedPoint = FirePoint & { active: boolean };

export type MapFires =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      mode: "points";
      points: MappedPoint[];
      activeCount: number;
      missingDays: number;
      totalDays: number;
    }
  | {
      status: "ready";
      mode: "cells";
      cells: FireCell[];
      months: string[];
      missingMonths: number;
    };

const ACTIVE_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;
const CELL_MARGIN = 1;

async function readPoints(
  period: MapPeriod,
  area: string | null,
  pointLayers: SeriesLayer[],
): Promise<MapFires> {
  const dates = periodDates(period);
  const days = await Promise.all(
    dates.map((date, index) => loadDayPoints(pointLayers[index], date, area)),
  );
  const loaded = days.flatMap((day) => day ?? []);
  const latest = Math.max(
    0,
    ...loaded.map((point) => Date.parse(point.acquiredAt)),
  );
  const windowStart = period.hours ? latest - period.hours * HOUR_MS : 0;
  const points = loaded
    .filter((point) => Date.parse(point.acquiredAt) > windowStart)
    .map((point) => ({
      ...point,
      active: Date.parse(point.acquiredAt) > latest - ACTIVE_HOURS * HOUR_MS,
    }));
  return {
    status: "ready",
    mode: "points",
    points,
    activeCount: points.filter((point) => point.active).length,
    missingDays: days.filter((day) => day === null).length,
    totalDays: dates.length,
  };
}

async function readCells(
  period: MapPeriod,
  area: string | null,
  bounds: AreaBounds | null,
  coverage: PipelineCoverage,
  harmonized: boolean,
): Promise<MapFires> {
  const months = periodMonths(period);
  const box: AreaBounds | null = bounds && [
    bounds[0] - CELL_MARGIN,
    bounds[1] - CELL_MARGIN,
    bounds[2] + CELL_MARGIN,
    bounds[3] + CELL_MARGIN,
  ];
  const [shape, ...monthly] = await Promise.all([
    area ? loadCountryShape(area) : null,
    ...months.map((month) =>
      loadMonthCells(
        month,
        harmonized ? "harmonized" : layerForMonth(month, coverage),
        box,
      ),
    ),
  ]);
  const totals = new Map<string, FireCell>();
  for (const cell of monthly.flatMap((cells) => cells ?? [])) {
    if (shape && !insideShape(cell.longitude, cell.latitude, shape)) {
      continue;
    }
    const key = `${cell.latitude}:${cell.longitude}`;
    const total = totals.get(key);
    totals.set(
      key,
      total ? { ...total, count: total.count + cell.count } : cell,
    );
  }
  return {
    status: "ready",
    mode: "cells",
    cells: [...totals.values()],
    months,
    missingMonths: monthly.filter((cells) => cells === null).length,
  };
}

export function useMapFires(
  period: MapPeriod | null,
  area: string | null,
  bounds: AreaBounds | null,
  coverage: PipelineCoverage | null,
  points: boolean,
  attempt: number,
  harmonized: boolean,
  pointLayers: SeriesLayer[],
): MapFires {
  const revision = usePipelineRevision();
  const dataKey =
    period && coverage
      ? [
          period.start,
          period.end,
          period.hours,
          area,
          bounds?.join(","),
          points,
          coverage.lastDataDate,
          points ? pointLayers.join(",") : harmonized,
        ].join("|")
      : null;
  const requestKey = dataKey && `${dataKey}|${revision}|${attempt}`;
  const [loaded, setLoaded] = useState<{
    requestKey: string;
    dataKey: string;
    fires: MapFires;
  } | null>(null);

  useEffect(() => {
    if (!requestKey || !dataKey || !period || !coverage) {
      return;
    }
    let current = true;
    const request = points
      ? readPoints(period, area, pointLayers)
      : readCells(period, area, bounds, coverage, harmonized);
    request.then(
      (fires) => current && setLoaded({ requestKey, dataKey, fires }),
      () =>
        current &&
        setLoaded({ requestKey, dataKey, fires: { status: "error" } }),
    );
    return () => {
      current = false;
    };
  }, [
    requestKey,
    dataKey,
    period,
    area,
    bounds,
    coverage,
    points,
    harmonized,
    pointLayers,
  ]);

  const fresh =
    loaded?.requestKey === requestKey ||
    (loaded?.dataKey === dataKey && loaded.fires.status === "ready");
  return loaded && fresh ? loaded.fires : { status: "loading" };
}
