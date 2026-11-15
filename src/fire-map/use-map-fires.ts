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
<<<<<<< HEAD
  loadRecentPoints,
  type RecentWindow,
=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
  loadMonthCells,
} from "./period-fires";

export type MappedPoint = FirePoint & { active: boolean };

<<<<<<< HEAD
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

=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
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
<<<<<<< HEAD
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
=======
): Promise<MapFires> {
  const dates = periodDates(period);
  const days = await Promise.all(
    dates.map((date, index) => loadDayPoints(pointLayers[index], date, area)),
  );
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
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
<<<<<<< HEAD
    missingDays: recent ? 0 : days.filter((day) => day === null).length,
=======
    missingDays: days.filter((day) => day === null).length,
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
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
<<<<<<< HEAD
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
=======
  const country = shape && shapeCells(shape, CELL_SIZE);
  const totals = new Map<string, FireCell>();
  for (const cell of monthly.flatMap((cells) => cells ?? [])) {
    if (
      country &&
      !cellTouchesShape(cell.latitude, cell.longitude, CELL_SIZE, country)
    ) {
      continue;
    }
    const key = `${cell.latitude}:${cell.longitude}`;
    const total = totals.get(key);
    const count = cellWeight
      ? cell.count * cellWeight(cell.latitude, cell.longitude)
      : cell.count;
    totals.set(key, {
      ...cell,
      count: (total?.count ?? 0) + count,
    });
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
  }
  return {
    status: "ready",
    mode: "cells",
<<<<<<< HEAD
    cells,
=======
    cells: [...totals.values()],
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
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
<<<<<<< HEAD
  recentWindow: RecentWindow | null,
=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
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
<<<<<<< HEAD
          points ? (recentWindow ?? "") : weightKey,
=======
          points ? "" : weightKey,
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
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
<<<<<<< HEAD
      ? readPoints(period, area, pointLayers, recentWindow)
=======
      ? readPoints(period, area, pointLayers)
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
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
<<<<<<< HEAD
    recentWindow,
=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
  ]);

  const fresh =
    loaded?.requestKey === requestKey ||
    (loaded?.dataKey === dataKey && loaded.fires.status === "ready");
  return loaded && fresh ? loaded.fires : { status: "loading" };
}
