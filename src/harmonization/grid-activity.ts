import type { Detection } from "../firms/detection.ts";
import type { Sensor } from "../firms/sensor.ts";
import {
  collectActiveCells,
  type ObservedPeriod,
  removeStaticCells,
  type SensorDays,
} from "./active-cells.ts";
import type { SensorCalibration } from "./fire-calendar.ts";
import { calibrateSeriesPeriod } from "./sensor-calibration.ts";
import {
  coveredSeriesPeriods,
  SERIES_PERIODS,
  type SeriesPeriod,
} from "./series-periods.ts";

export type ActivityGrid = {
  cellsBySensor: Map<Sensor, SensorDays>;
  observedPeriods: Map<Sensor, ObservedPeriod>;
  coveredPeriods: SeriesPeriod[];
  staticCells: number[];
  calibrations: SensorCalibration[];
};

export function gridActivity(detections: Iterable<Detection>): ActivityGrid {
  const { cellsBySensor, observedPeriods } = collectActiveCells(
    detections,
    SERIES_PERIODS.map((period) => period.sensor),
  );
  const coveredPeriods = coveredSeriesPeriods(observedPeriods);
  const staticCells = removeStaticCells(
    cellsBySensor,
    SERIES_PERIODS[0].firstDay,
    coveredPeriods.at(-1)!.lastDay,
  );
  const calibrations = coveredPeriods.flatMap((period) =>
    calibrateSeriesPeriod(period, observedPeriods, cellsBySensor, null),
  );
  return {
    cellsBySensor,
    observedPeriods,
    coveredPeriods,
    staticCells,
    calibrations,
  };
}
