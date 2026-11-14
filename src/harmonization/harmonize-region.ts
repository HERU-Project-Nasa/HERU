import type { Sensor } from "../firms/sensor.ts";
import type { Region } from "../regions/region-catalog.ts";
import {
  activeCellCount,
  activeCells,
  restrictToCells,
  type SensorDays,
} from "./active-cells.ts";
import {
  calendarDate,
  DAYS_PER_WEEK,
  WEEKS_PER_YEAR,
  weekDays,
} from "./calendar-day.ts";
import type {
  HarmonizedRegion,
  ObservedDay,
  ObservedYear,
  SensorCalibration,
} from "./fire-calendar.ts";
import type { ActivityGrid } from "./grid-activity.ts";
import { cellPosition, GLOBAL_GRID, regionCells } from "./grid-cell.ts";
import {
  calibrateSeriesPeriod,
  harmonizedCellCount,
} from "./sensor-calibration.ts";
import {
  FIRST_CALENDAR_YEAR,
  periodWithMostDays,
  REFERENCE_SENSOR,
} from "./series-periods.ts";
import {
  compareWithBaseline,
  type WeekObservation,
} from "./weekly-baseline.ts";

export function harmonizeRegion(
  activity: ActivityGrid,
  region: Region,
): HarmonizedRegion {
  const cells = regionCells(region);
  const cellsBySensor = restrictToCells(activity.cellsBySensor, cells);
  if (
    [...cellsBySensor.values()].every((sensorDays) => sensorDays.size === 0)
  ) {
    throw new Error(
      `No active cells inside ${region.id}; the downloaded data may not cover it`,
    );
  }
  const calibrations = activity.coveredPeriods.flatMap((period) =>
    calibrateSeriesPeriod(
      period,
      activity.observedPeriods,
      cellsBySensor,
      activity.calibrations,
    ),
  );

  const observations: WeekObservation[] = [];
  const observedDaysByYear = new Map<number, ObservedDay[]>();
  for (const [year, week] of completeWeeks(
    activity.coveredPeriods.at(-1)!.lastDay,
  )) {
    const { observation, observedDays } = observeWeek(
      year,
      week,
      cellsBySensor,
      calibrations,
    );
    observations.push(observation);
    observedDaysByYear.set(year, [
      ...(observedDaysByYear.get(year) ?? []),
      ...observedDays,
    ]);
  }

  if (observations.length === 0) {
    throw new Error(`No complete week of data for ${region.id}`);
  }
  const { weeks, fireSeason } = compareWithBaseline(observations);
  const observedYears: ObservedYear[] = [...observedDaysByYear].map(
    ([year, days]) => ({ year, days }),
  );

  return {
    calendar: {
      regionId: region.id,
      referenceSensor: REFERENCE_SENSOR,
      firstYear: FIRST_CALENDAR_YEAR,
      lastYear: weeks.at(-1)!.year,
      grid: GLOBAL_GRID,
      staticCells: activity.staticCells
        .filter((cell) => cells.has(cell))
        .map(cellPosition),
      weeks,
      fireSeason,
      calibrations,
    },
    observedYears,
  };
}

function* completeWeeks(
  lastCoveredDay: number,
): Generator<[year: number, week: number]> {
  for (
    let year = FIRST_CALENDAR_YEAR;
    year <= calendarDate(lastCoveredDay).year;
    year++
  ) {
    for (let week = 1; week <= WEEKS_PER_YEAR; week++) {
      if (weekDays(year, week).at(-1)! > lastCoveredDay) {
        return;
      }
      yield [year, week];
    }
  }
}

function observeWeek(
  year: number,
  week: number,
  cellsBySensor: Map<Sensor, SensorDays>,
  calibrations: SensorCalibration[],
): { observation: WeekObservation; observedDays: ObservedDay[] } {
  const period = periodWithMostDays(weekDays(year, week));
  const periodDays = weekDays(year, week).filter(
    (day) => day >= period.firstDay && day <= period.lastDay,
  );
  const sensorDays = cellsBySensor.get(period.sensor)!;
  const sensorCalibrations = calibrations.filter(
    (calibration) => calibration.source === period.sensor,
  );

  let observedCellDays = 0;
  let harmonizedCellDays = 0;
  const observedDays: ObservedDay[] = [];
  for (const day of periodDays) {
    const dailyCells = sensorDays.get(day);
    if (!dailyCells || activeCellCount(dailyCells) === 0) {
      continue;
    }
    const { month, dayOfYear } = calendarDate(day);
    observedCellDays += activeCellCount(dailyCells);
    harmonizedCellDays +=
      period.sensor === REFERENCE_SENSOR
        ? activeCellCount(dailyCells)
        : harmonizedCellCount(dailyCells, month, sensorCalibrations);
    observedDays.push({
      dayOfYear,
      sensor: period.sensor,
      cells: [...activeCells(dailyCells)].map(cellPosition),
    });
  }

  return {
    observation: {
      year,
      week,
      observedSensor: period.sensor,
      observedCellDays,
      harmonizedCellDays:
        (harmonizedCellDays * DAYS_PER_WEEK) / periodDays.length,
    },
    observedDays,
  };
}
