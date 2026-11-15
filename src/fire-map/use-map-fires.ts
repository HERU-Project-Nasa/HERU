import { useEffect, useState } from "react";
import {
  cellTouchesShape,
  loadCountryShape,
  shapeCells,
} from "@/country-outlines/country-outlines";
import type { PipelineCoverage } from "@/pipeline/pipeline-coverage";
import { usePipelineRevision } from "@/pipeline/pipeline-files";
import type { SeriesLayer } from "@/pipeline/series-row";
import { type MapPeriod, periodDates, periodMonths } from "./map-period";
import {
  type AreaBounds,
  type CellColumn,
  type FireCell,
  type FirePoint,
  loadDayPoints,
  loadRecentPoints,
  type RecentWindow,
  loadMonthCells,
} from "./period-fires";

export type MappedPoint = FirePoint & { active: boolean };

const CELLS_PER_TASK = 4000;

function nextTask(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

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
const CELL_SIZE = 0.25;

async function readPoints(
  period: MapPeriod,
  area: string | null,
  pointLayers: SeriesLayer[],
  recentWindow: RecentWindow | null,
): Promise<MapFires> {
  const dates = periodDates(period);
  const recent = recentWindow
    ? await loadRecentPoints(pointLayers.at(-1)!, recentWindow, area)
    : null;
  const days = recent
    ? [recent]
    : await Promise.all(
        dates.map((date, index) =>
          loadDayPoints(pointLayers[index], date, area),
        ),
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
    missingDays: recent ? 0 : days.filter((day) => day === null).length,
    totalDays: dates.length,
  };
}

async function readCells(
  period: MapPeriod,
  area: string | null,
  bounds: AreaBounds | null,
  cellColumns: CellColumn[],
  cellWeight: ((latitude: number, longitude: number) => number) | null,
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
    ...months.map((month, index) =>
      loadMonthCells(month, cellColumns[index], box),
    ),
  ]);
  const totals = new Map<string, FireCell>();
  for (const cells of monthly) {
    await nextTask();
    for (const cell of cells ?? []) {
      const key = `${cell.latitude}:${cell.longitude}`;
      const total = totals.get(key);
      const count = cellWeight
        ? cell.count * cellWeight(cell.latitude, cell.longitude)
        : cell.count;
      totals.set(key, {
        ...cell,
        count: (total?.count ?? 0) + count,
      });
    }
  }
  const country = shape && shapeCells(shape, CELL_SIZE);
  const cells: FireCell[] = [];
  let checked = 0;
  for (const cell of totals.values()) {
    checked += 1;
    if (checked % CELLS_PER_TASK === 0) {
      await nextTask();
    }
    if (
      !country ||
      cellTouchesShape(cell.latitude, cell.longitude, CELL_SIZE, country)
    ) {
      cells.push(cell);
    }
  }
  return {
    status: "ready",
    mode: "cells",
    cells,
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
  pointLayers: SeriesLayer[],
  cellColumns: CellColumn[],
  cellWeight: ((latitude: number, longitude: number) => number) | null,
  weightKey: string,
  recentWindow: RecentWindow | null,
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
          points ? pointLayers.join(",") : cellColumns.join(","),
          points ? (recentWindow ?? "") : weightKey,
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
      ? readPoints(period, area, pointLayers, recentWindow)
      : readCells(period, area, bounds, cellColumns, cellWeight);
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
    pointLayers,
    cellColumns,
    cellWeight,
    recentWindow,
  ]);

  const fresh =
    loaded?.requestKey === requestKey ||
    (loaded?.dataKey === dataKey && loaded.fires.status === "ready");
  return loaded && fresh ? loaded.fires : { status: "loading" };
}
