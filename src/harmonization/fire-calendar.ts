import type { Sensor } from "../firms/sensor.ts";

export type CalendarWeek = {
  year: number;
  week: number;
  observedSensor: Sensor;
  observedCellDays: number;
  harmonizedCellDays: number;
  expected: number;
  upperBound: number;
  anomaly: boolean;
};

export type SensorCalibration = {
  source: Sensor;
  target: Sensor;
  month: number;
  daytime: boolean;
  factor: number;
  spread: [number, number];
};

export type CalendarGrid = {
  west: number;
  south: number;
  step: number;
};

export type FireCalendar = {
  regionId: string;
  referenceSensor: Sensor;
  firstYear: number;
  lastYear: number;
  grid: CalendarGrid;
  staticCells: [column: number, row: number][];
  weeks: CalendarWeek[];
  fireSeason: number[];
  calibrations: SensorCalibration[];
};

export type ObservedDay = {
  dayOfYear: number;
  sensor: Sensor;
  cells: [column: number, row: number][];
};

export type ObservedYear = {
  year: number;
  days: ObservedDay[];
};

export type HarmonizedRegion = {
  calendar: FireCalendar;
  observedYears: ObservedYear[];
};
