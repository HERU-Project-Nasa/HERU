import type { Sensor } from "../firms/sensor.ts";
import {
  type DailyCells,
  nightOnlyCellCount,
  type ObservedPeriod,
  type SensorDays,
} from "./active-cells.ts";
import { calendarDate, isoDate } from "./calendar-day.ts";
import type { SensorCalibration } from "./fire-calendar.ts";
import { REFERENCE_SENSOR, type SeriesPeriod } from "./series-periods.ts";
import { percentile, roundTo } from "./statistics.ts";

const MINIMUM_CALIBRATION_CELLS = 50;
const SPREAD_PERCENTILES = [0.25, 0.75] as const;
const FACTOR_DECIMALS = 3;
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const PERIODS = [true, false];

type CellTotals = { source: number; target: number };

type CalibrationPair = {
  source: Sensor;
  target: Sensor;
  sourceCells: SensorDays;
  targetCells: SensorDays;
  firstDay: number;
  lastDay: number;
};

export function calibrateSeriesPeriod(
  period: SeriesPeriod,
  observedPeriods: Map<Sensor, ObservedPeriod>,
  cellsBySensor: Map<Sensor, SensorDays>,
  fallbackCalibrations: SensorCalibration[] | null,
): SensorCalibration[] {
  if (!period.calibrationWindow) {
    return [];
  }
  const source = observedPeriods.get(period.sensor)!;
  const target = observedPeriods.get(REFERENCE_SENSOR);
  const [windowFirstDay, windowLastDay] = period.calibrationWindow;
  const firstDay = Math.max(
    windowFirstDay,
    source.firstDay,
    target?.firstDay ?? Infinity,
  );
  const lastDay = Math.min(
    windowLastDay,
    source.lastDay,
    target?.lastDay ?? -Infinity,
  );
  if (firstDay > lastDay) {
    throw new Error(
      `${period.sensor} and ${REFERENCE_SENSOR} have no data in common between ${isoDate(windowFirstDay)} and ${isoDate(windowLastDay)}`,
    );
  }
  return calibrateSensor(
    {
      source: period.sensor,
      target: REFERENCE_SENSOR,
      sourceCells: cellsBySensor.get(period.sensor)!,
      targetCells: cellsBySensor.get(REFERENCE_SENSOR)!,
      firstDay,
      lastDay,
    },
    fallbackCalibrations,
  );
}

function calibrateSensor(
  pair: CalibrationPair,
  fallbackCalibrations: SensorCalibration[] | null,
): SensorCalibration[] {
  const totals = new Map<string, Map<number, CellTotals>>();
  for (let day = pair.firstDay; day <= pair.lastDay; day++) {
    const { year, month } = calendarDate(day);
    const sourceCells = pair.sourceCells.get(day);
    const targetCells = pair.targetCells.get(day);
    for (const daytime of PERIODS) {
      const yearly =
        totals.get(totalsKey(month, daytime)) ?? new Map<number, CellTotals>();
      const yearTotals = yearly.get(year) ?? { source: 0, target: 0 };
      yearTotals.source += periodCellCount(sourceCells, daytime);
      yearTotals.target += periodCellCount(targetCells, daytime);
      yearly.set(year, yearTotals);
      totals.set(totalsKey(month, daytime), yearly);
    }
  }

  return PERIODS.flatMap((daytime) => {
    const monthlyTotals = MONTHS.map(
      (month) =>
        totals.get(totalsKey(month, daytime)) ?? new Map<number, CellTotals>(),
    );
    const periodTotals = mergeYearlyTotals(monthlyTotals);
    return MONTHS.map((month, index) => {
      const sufficientTotals = [monthlyTotals[index], periodTotals].find(
        (yearly) => sumTotals(yearly).source >= MINIMUM_CALIBRATION_CELLS,
      );
      const fallback = fallbackCalibrations?.find(
        (calibration) =>
          calibration.source === pair.source &&
          calibration.month === month &&
          calibration.daytime === daytime,
      );
      if (!sufficientTotals && fallback) {
        return fallback;
      }
      const yearly = sufficientTotals ?? periodTotals;
      if (sumTotals(yearly).source === 0) {
        throw new Error(
          `No ${daytime ? "daytime" : "nighttime"} ${pair.source} cells to calibrate against ${pair.target}`,
        );
      }
      return {
        source: pair.source,
        target: pair.target,
        month,
        daytime,
        ...factorAndSpread(yearly),
      };
    });
  });
}

export function harmonizedCellCount(
  dailyCells: DailyCells,
  month: number,
  calibrations: SensorCalibration[],
): number {
  const factor = (daytime: boolean) =>
    calibrations.find(
      (calibration) =>
        calibration.month === month && calibration.daytime === daytime,
    )!.factor;
  return (
    factor(true) * dailyCells.daytime.size +
    factor(false) * nightOnlyCellCount(dailyCells)
  );
}

function periodCellCount(
  dailyCells: DailyCells | undefined,
  daytime: boolean,
): number {
  if (!dailyCells) {
    return 0;
  }
  return daytime ? dailyCells.daytime.size : nightOnlyCellCount(dailyCells);
}

function factorAndSpread(
  yearly: Map<number, CellTotals>,
): Pick<SensorCalibration, "factor" | "spread"> {
  const pooled = sumTotals(yearly);
  const yearlyFactors = [...yearly.values()]
    .filter((yearTotals) => yearTotals.source > 0)
    .map((yearTotals) => yearTotals.target / yearTotals.source)
    .sort((first, second) => first - second);
  const [lowerSpread, upperSpread] = SPREAD_PERCENTILES.map((fraction) =>
    percentile(yearlyFactors, fraction),
  );
  return {
    factor: roundTo(pooled.target / pooled.source, FACTOR_DECIMALS),
    spread: [
      roundTo(lowerSpread, FACTOR_DECIMALS),
      roundTo(upperSpread, FACTOR_DECIMALS),
    ],
  };
}

function mergeYearlyTotals(
  yearlyTotals: Map<number, CellTotals>[],
): Map<number, CellTotals> {
  const merged = new Map<number, CellTotals>();
  for (const yearly of yearlyTotals) {
    for (const [year, yearTotals] of yearly) {
      const mergedYear = merged.get(year) ?? { source: 0, target: 0 };
      mergedYear.source += yearTotals.source;
      mergedYear.target += yearTotals.target;
      merged.set(year, mergedYear);
    }
  }
  return merged;
}

function sumTotals(yearly: Map<number, CellTotals>): CellTotals {
  let source = 0;
  let target = 0;
  for (const yearTotals of yearly.values()) {
    source += yearTotals.source;
    target += yearTotals.target;
  }
  return { source, target };
}

function totalsKey(month: number, daytime: boolean): string {
  return `${month}:${daytime ? "day" : "night"}`;
}
