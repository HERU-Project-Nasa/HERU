import { describe, expect, it } from "vitest";
import type { Detection } from "../firms/detection.ts";
import type { Sensor } from "../firms/sensor.ts";
import type { Region } from "../regions/region-catalog.ts";
import type { FireCalendar } from "./fire-calendar.ts";
import { gridActivity } from "./grid-activity.ts";
import { harmonizeRegion } from "./harmonize-region.ts";

type Cell = [column: number, row: number];
type SeriesSensor = "modis-aqua" | "viirs-snpp" | "viirs-noaa20";

const GRID_STEP = 0.05;
const MILLISECONDS_PER_DAY = 86_400_000;

const region: Region = {
  id: "test-region",
  name: "Test region",
  kind: "biome",
  bounds: [-58, -20, -56, -18],
  shape: {
    type: "Polygon",
    coordinates: [
      [
        [-58, -20],
        [-56, -20],
        [-56, -18],
        [-58, -18],
        [-58, -20],
      ],
      [
        [-56.6, -18.6],
        [-56.1, -18.6],
        [-56.1, -18.1],
        [-56.6, -18.1],
        [-56.6, -18.6],
      ],
    ],
  },
};

const FIRE_SEASON_DAYS = { first: 200, last: 320 };
const CELLS_PER_DAY: Record<
  SeriesSensor,
  { daytime: number; nightOnly: number }
> = {
  "modis-aqua": { daytime: 4, nightOnly: 1 },
  "viirs-snpp": { daytime: 8, nightOnly: 3 },
  "viirs-noaa20": { daytime: 6, nightOnly: 3 },
};
const quietCorner: Region = {
  id: "quiet-corner",
  name: "Quiet corner",
  kind: "state",
  bounds: [-57.9, -18.7, -57.75, -18.55],
  shape: {
    type: "Polygon",
    coordinates: [
      [
        [-57.9, -18.7],
        [-57.75, -18.7],
        [-57.75, -18.55],
        [-57.9, -18.55],
        [-57.9, -18.7],
      ],
    ],
  },
};

const farAwayRegion: Region = {
  ...quietCorner,
  id: "far-away",
  bounds: [10, 10, 11, 11],
  shape: {
    type: "Polygon",
    coordinates: [
      [
        [10, 10],
        [11, 10],
        [11, 11],
        [10, 11],
        [10, 10],
      ],
    ],
  },
};

const GAS_FLARE: Cell = [20, 27];
const QUIET_CELL: Cell = [3, 27];
const CELL_IN_HOLE: Cell = [33, 33];

function detection(
  sensor: Sensor,
  date: string,
  daytime: boolean,
  [column, row]: Cell,
  confidence: Detection["confidence"] = "nominal",
): Detection {
  return {
    sensor,
    latitude: region.bounds[1] + (row + 0.5) * GRID_STEP,
    longitude: region.bounds[0] + (column + 0.5) * GRID_STEP,
    acquiredAt: `${date}T${daytime ? "17:30" : "05:30"}:00Z`,
    confidence,
    radiativePower: 12.5,
    daytime,
  };
}

function globalCell([column, row]: Cell): Cell {
  return [
    column + Math.round((region.bounds[0] + 180) / GRID_STEP),
    row + Math.round((region.bounds[1] + 90) / GRID_STEP),
  ];
}

function* dates(firstDate: string, lastDate: string): Generator<string> {
  for (
    let time = Date.parse(firstDate);
    time <= Date.parse(lastDate);
    time += MILLISECONDS_PER_DAY
  ) {
    yield new Date(time).toISOString().slice(0, 10);
  }
}

function dayOfYear(date: string): number {
  return (
    (Date.parse(date) - Date.parse(`${date.slice(0, 4)}-01-01`)) /
      MILLISECONDS_PER_DAY +
    1
  );
}

function operatingSensors(date: string): SeriesSensor[] {
  const sensors: SeriesSensor[] = ["modis-aqua"];
  if (date >= "2012-01-20" && date <= "2026-11-02") {
    sensors.push("viirs-snpp");
  }
  if (date >= "2019-01-01") {
    sensors.push("viirs-noaa20");
  }
  return sensors;
}

function* steadyFireRegime(lastDate: string): Generator<Detection> {
  for (const date of dates("2003-01-01", lastDate)) {
    for (const sensor of operatingSensors(date)) {
      yield detection(sensor, date, false, GAS_FLARE);
      const day = dayOfYear(date);
      const lastSnppDay = sensor === "viirs-snpp" && date === "2026-11-02";
      if (
        day < FIRE_SEASON_DAYS.first ||
        day > FIRE_SEASON_DAYS.last ||
        lastSnppDay
      ) {
        continue;
      }
      const firstColumn = day % 25;
      const row = 2 + (Number(date.slice(0, 4)) % 6) * 4;
      const { daytime, nightOnly } = CELLS_PER_DAY[sensor];
      for (let offset = 0; offset < daytime; offset++) {
        yield detection(sensor, date, true, [firstColumn + offset, row]);
      }
      for (let offset = 0; offset < nightOnly; offset++) {
        yield detection(sensor, date, false, [firstColumn + offset, row + 1]);
      }
    }
  }
}

function* unusualWeekIn2008(): Generator<Detection> {
  for (const date of dates("2008-08-26", "2008-09-01")) {
    for (let column = 0; column < 15; column++) {
      yield detection("modis-aqua", date, true, [column, 26]);
    }
  }
}

function* sevenPixelFire(): Generator<Detection> {
  const pixel = detection("viirs-snpp", "2015-03-10", true, QUIET_CELL);
  for (let offset = 0; offset < 7; offset++) {
    yield {
      ...pixel,
      latitude: pixel.latitude + offset * 0.003,
      longitude: pixel.longitude - offset * 0.003,
    };
  }
}

function weekOf(calendar: FireCalendar, year: number, week: number) {
  return calendar.weeks.find(
    (calendarWeek) => calendarWeek.year === year && calendarWeek.week === week,
  )!;
}

describe("harmonizeRegion", () => {
  const activity = gridActivity([
    ...steadyFireRegime("2021-12-31"),
    ...unusualWeekIn2008(),
    ...sevenPixelFire(),
    detection("viirs-snpp", "2016-03-15", true, CELL_IN_HOLE),
    detection("viirs-snpp", "2016-04-12", true, QUIET_CELL, "low"),
    detection("modis-terra", "2016-05-10", true, QUIET_CELL),
    detection("viirs-snpp", "2016-06-07", true, QUIET_CELL),
  ]);
  const { calendar, observedYears } = harmonizeRegion(activity, region);

  it("covers every complete week from 2003 to the last day with data", () => {
    expect(calendar.firstYear).toBe(2003);
    expect(calendar.lastYear).toBe(2021);
    expect(calendar.weeks).toHaveLength(19 * 52);
  });

  it("counts a fire that lights seven VIIRS pixels as one active cell", () => {
    expect(weekOf(calendar, 2015, 10).observedCellDays).toBe(1);
    const day = observedYears
      .find(({ year }) => year === 2015)!
      .days.find(({ dayOfYear }) => dayOfYear === 69);
    expect(day).toEqual({
      dayOfYear: 69,
      sensor: "viirs-snpp",
      cells: [globalCell(QUIET_CELL)],
    });
  });

  it("removes the sensor step of 2012 after calibration", () => {
    expect(weekOf(calendar, 2011, 32)).toMatchObject({
      observedSensor: "modis-aqua",
      observedCellDays: 35,
      harmonizedCellDays: 77,
    });
    expect(weekOf(calendar, 2012, 32)).toMatchObject({
      observedSensor: "viirs-snpp",
      observedCellDays: 77,
      harmonizedCellDays: 77,
    });
  });

  it("calibrates daytime and nighttime cells separately", () => {
    expect(calendar.calibrations).toHaveLength(24);
    for (const calibration of calendar.calibrations) {
      expect(calibration).toMatchObject({
        source: "modis-aqua",
        target: "viirs-snpp",
      });
      expect(calibration.factor).toBe(calibration.daytime ? 2 : 3);
    }
  });

  it("flags a week far above the same week in other years", () => {
    expect(weekOf(calendar, 2008, 35)).toMatchObject({
      harmonizedCellDays: 287,
      expected: 77,
      anomaly: true,
    });
    expect(weekOf(calendar, 2009, 35).anomaly).toBe(false);
    const seasonAnomalies = calendar.weeks.filter(
      (week) => week.anomaly && calendar.fireSeason.includes(week.week),
    );
    expect(seasonAnomalies.map(({ year, week }) => [year, week])).toEqual([
      [2008, 35],
    ]);
  });

  it("marks the weeks with the highest typical activity as the fire season", () => {
    expect(calendar.fireSeason).toEqual(
      Array.from({ length: 16 }, (_, index) => 30 + index),
    );
  });

  it("treats a cell that is active almost every day as a static source", () => {
    expect(calendar.staticCells).toEqual([globalCell(GAS_FLARE)]);
  });

  it("restricts a region to the cells whose center lies inside it", () => {
    const corner = harmonizeRegion(activity, quietCorner).calendar;
    expect(weekOf(corner, 2015, 10).observedCellDays).toBe(1);
    expect(weekOf(corner, 2011, 32).observedCellDays).toBe(0);
    expect(corner.staticCells).toEqual([]);
  });

  it("uses the calibration of the whole area when a region has too few cells", () => {
    const corner = harmonizeRegion(activity, quietCorner).calendar;
    expect(weekOf(corner, 2008, 35)).toMatchObject({
      observedCellDays: 21,
      harmonizedCellDays: 42,
    });
    expect(corner.calibrations).toEqual(activity.calibrations);
  });

  it("refuses a region outside the downloaded data", () => {
    expect(() => harmonizeRegion(activity, farAwayRegion)).toThrow(
      /No active cells inside far-away/,
    );
  });

  it("ignores detections outside the shape, with low confidence or from Terra", () => {
    expect(weekOf(calendar, 2016, 11).observedCellDays).toBe(0);
    expect(weekOf(calendar, 2016, 15).observedCellDays).toBe(0);
    expect(weekOf(calendar, 2016, 19).observedCellDays).toBe(0);
    expect(weekOf(calendar, 2016, 23).observedCellDays).toBe(1);
  });

  it("keeps the cells of each observed day so the map adds up to the week", () => {
    const daysOfWeek32 = observedYears
      .find(({ year }) => year === 2011)!
      .days.filter(({ dayOfYear }) => dayOfYear >= 218 && dayOfYear <= 224);
    const mappedCellDays = daysOfWeek32.reduce(
      (total, { cells }) => total + cells.length,
      0,
    );
    expect(mappedCellDays).toBe(weekOf(calendar, 2011, 32).observedCellDays);
  });
});

describe("harmonizeRegion after the end of Suomi NPP", () => {
  const { calendar } = harmonizeRegion(
    gridActivity(steadyFireRegime("2026-11-14")),
    region,
  );

  it("calibrates NOAA-20 against Suomi NPP", () => {
    const noaa20 = calendar.calibrations.filter(
      ({ source }) => source === "viirs-noaa20",
    );
    expect(noaa20).toHaveLength(24);
    for (const calibration of noaa20) {
      expect(calibration.factor).toBe(calibration.daytime ? 1.333 : 1);
    }
  });

  it("keeps the week of the switch with the sensor that covers most of it", () => {
    expect(weekOf(calendar, 2026, 44)).toMatchObject({
      observedSensor: "viirs-snpp",
      observedCellDays: 44,
      harmonizedCellDays: 77,
    });
  });

  it("continues the series with NOAA-20 in Suomi NPP units", () => {
    expect(weekOf(calendar, 2026, 45)).toMatchObject({
      observedSensor: "viirs-noaa20",
      observedCellDays: 63,
      harmonizedCellDays: 77,
    });
    expect(calendar.weeks.at(-1)).toMatchObject({ year: 2026, week: 45 });
  });
});

describe("gridActivity input checks", () => {
  it("refuses a history that starts years after 2003", () => {
    expect(() =>
      gridActivity([detection("modis-aqua", "2010-01-01", true, QUIET_CELL)]),
    ).toThrow(/modis-aqua data starts on 2010-01-01/);
  });
});
