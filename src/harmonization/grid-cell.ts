import { contains } from "../regions/contains.ts";
import type { Region } from "../regions/region-catalog.ts";
import type { CalendarGrid } from "./fire-calendar.ts";

export const GLOBAL_GRID: CalendarGrid = { west: -180, south: -90, step: 0.05 };

const ROWS_PER_COLUMN_KEY = 10_000;

export function cellKey(latitude: number, longitude: number): number {
  const column = Math.floor((longitude - GLOBAL_GRID.west) / GLOBAL_GRID.step);
  const row = Math.floor((latitude - GLOBAL_GRID.south) / GLOBAL_GRID.step);
  return column * ROWS_PER_COLUMN_KEY + row;
}

export function cellPosition(cell: number): [column: number, row: number] {
  return [Math.floor(cell / ROWS_PER_COLUMN_KEY), cell % ROWS_PER_COLUMN_KEY];
}

export function regionCells(region: Region): Set<number> {
  const [west, south, east, north] = region.bounds;
  const [firstColumn, firstRow] = cellPosition(cellKey(south, west));
  const [lastColumn, lastRow] = cellPosition(cellKey(north, east));
  const cells = new Set<number>();
  for (let column = firstColumn; column <= lastColumn; column++) {
    for (let row = firstRow; row <= lastRow; row++) {
      const longitude = GLOBAL_GRID.west + (column + 0.5) * GLOBAL_GRID.step;
      const latitude = GLOBAL_GRID.south + (row + 0.5) * GLOBAL_GRID.step;
      if (contains(region, latitude, longitude)) {
        cells.add(column * ROWS_PER_COLUMN_KEY + row);
      }
    }
  }
  return cells;
}
