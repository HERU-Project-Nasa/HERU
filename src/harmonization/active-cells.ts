import type { Detection } from "../firms/detection.ts";
import type { Sensor } from "../firms/sensor.ts";
import { solarDayNumber } from "./calendar-day.ts";
import { cellKey } from "./grid-cell.ts";

const STATIC_CELL_DAY_FRACTION = 0.1;

export type DailyCells = {
  daytime: Set<number>;
  nighttime: Set<number>;
};

export type SensorDays = Map<number, DailyCells>;

export type ObservedPeriod = {
  firstDay: number;
  lastDay: number;
};

export function collectActiveCells(
  detections: Iterable<Detection>,
  sensors: Sensor[],
): {
  cellsBySensor: Map<Sensor, SensorDays>;
  observedPeriods: Map<Sensor, ObservedPeriod>;
} {
  const cellsBySensor = new Map<Sensor, SensorDays>(
    sensors.map((sensor) => [sensor, new Map()]),
  );
  const observedPeriods = new Map<Sensor, ObservedPeriod>();

  for (const detection of detections) {
    const sensorDays = cellsBySensor.get(detection.sensor);
    if (!sensorDays) {
      continue;
    }
    const day = solarDayNumber(detection.acquiredAt, detection.longitude);
    extendObservedPeriod(observedPeriods, detection.sensor, day);
    if (detection.confidence === "low") {
      continue;
    }
    let dailyCells = sensorDays.get(day);
    if (!dailyCells) {
      dailyCells = { daytime: new Set(), nighttime: new Set() };
      sensorDays.set(day, dailyCells);
    }
    const cell = cellKey(detection.latitude, detection.longitude);
    (detection.daytime ? dailyCells.daytime : dailyCells.nighttime).add(cell);
  }

  return { cellsBySensor, observedPeriods };
}

export function removeStaticCells(
  cellsBySensor: Map<Sensor, SensorDays>,
  firstDay: number,
  lastDay: number,
): number[] {
  const activeDaysByCell = new Map<number, Set<number>>();
  for (const sensorDays of cellsBySensor.values()) {
    for (const [day, dailyCells] of sensorDays) {
      if (day < firstDay || day > lastDay) {
        continue;
      }
      for (const cell of activeCells(dailyCells)) {
        const activeDays = activeDaysByCell.get(cell) ?? new Set<number>();
        activeDays.add(day);
        activeDaysByCell.set(cell, activeDays);
      }
    }
  }

  const totalDays = lastDay - firstDay + 1;
  const staticCells = [...activeDaysByCell]
    .filter(
      ([, activeDays]) =>
        activeDays.size / totalDays > STATIC_CELL_DAY_FRACTION,
    )
    .map(([cell]) => cell)
    .sort((first, second) => first - second);

  for (const sensorDays of cellsBySensor.values()) {
    for (const dailyCells of sensorDays.values()) {
      for (const cell of staticCells) {
        dailyCells.daytime.delete(cell);
        dailyCells.nighttime.delete(cell);
      }
    }
  }
  return staticCells;
}

export function restrictToCells(
  cellsBySensor: Map<Sensor, SensorDays>,
  cells: Set<number>,
): Map<Sensor, SensorDays> {
  const restricted = new Map<Sensor, SensorDays>();
  for (const [sensor, sensorDays] of cellsBySensor) {
    const restrictedDays: SensorDays = new Map();
    for (const [day, dailyCells] of sensorDays) {
      const daytime = dailyCells.daytime.intersection(cells);
      const nighttime = dailyCells.nighttime.intersection(cells);
      if (daytime.size > 0 || nighttime.size > 0) {
        restrictedDays.set(day, { daytime, nighttime });
      }
    }
    restricted.set(sensor, restrictedDays);
  }
  return restricted;
}

export function activeCells(dailyCells: DailyCells): Set<number> {
  return dailyCells.daytime.union(dailyCells.nighttime);
}

export function nightOnlyCellCount(dailyCells: DailyCells): number {
  return dailyCells.nighttime.difference(dailyCells.daytime).size;
}

export function activeCellCount(dailyCells: DailyCells): number {
  return dailyCells.daytime.size + nightOnlyCellCount(dailyCells);
}

function extendObservedPeriod(
  observedPeriods: Map<Sensor, ObservedPeriod>,
  sensor: Sensor,
  day: number,
) {
  const period = observedPeriods.get(sensor);
  if (!period) {
    observedPeriods.set(sensor, { firstDay: day, lastDay: day });
  } else {
    period.firstDay = Math.min(period.firstDay, day);
    period.lastDay = Math.max(period.lastDay, day);
  }
}
