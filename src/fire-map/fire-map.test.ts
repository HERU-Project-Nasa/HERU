import type { MultiPolygon } from "geojson";
import { describe, expect, it } from "vitest";
import {
  cellTouchesShape,
  shapeCells,
} from "@/country-outlines/country-outlines";
import { buildCalendarYears } from "@/fire-calendar/calendar-matrix";
import { type CoverageRow, readCoverage } from "@/pipeline/pipeline-coverage";
import type { SeriesMonthRow } from "@/pipeline/series-row";
import {
  addPeriodToSearch,
  anchoredPeriod,
  dateRangeLabel,
  layerForMonth,
  partialDaysLabel,
  periodFromSearch,
  presetPeriod,
  usesPoints,
} from "./map-period";
import { sensorCovers, sensorFactor } from "./sensor-picker";
import {
  blockId,
  countedInSeries,
  harmonizedWeight,
  readBlockFactors,
  readStaticSources,
} from "./period-fires";

function coverageRow(
  layer: string,
  processing: "sp" | "nrt",
  first: string,
  last: string,
  complete: string,
): CoverageRow {
  return {
    layer,
    processing,
    first_date: first,
    last_date: last,
    rows: 1,
    updated_at: "2026-11-15T03:40:12Z",
    complete_date: complete,
  };
}

const coverage = readCoverage([
  coverageRow("landsat", "nrt", "2022-06-20", "2026-11-14", "2026-11-13"),
  coverageRow("modis", "nrt", "2026-09-01", "2026-11-14", "2026-11-13"),
  coverageRow("modis", "sp", "2000-11-01", "2026-08-31", "2026-08-31"),
  coverageRow("viirs_noaa20", "nrt", "2026-08-01", "2026-11-14", "2026-11-13"),
  coverageRow("viirs_noaa20", "sp", "2018-04-01", "2026-07-31", "2026-07-31"),
  coverageRow("viirs_snpp", "nrt", "2026-08-01", "2026-11-02", "2026-11-02"),
  coverageRow("viirs_snpp", "sp", "2012-01-20", "2026-07-31", "2026-07-31"),
]);

describe("countedInSeries", () => {
  const staticSources = readStaticSources(
    "lat,lon\n-54.83,-68.33\n-54.82,-68.34\n10.5,20.25\n",
  );

  it("keeps only vegetation fires when the type is known", () => {
    for (const [type, kept] of [
      [0, true],
      [1, false],
      [2, false],
      [3, false],
    ] as const) {
      expect(
        countedInSeries({ latitude: -54.825, longitude: -68.331, type }, null),
      ).toBe(kept);
    }
  });

  it("drops near real-time points on a static source cell", () => {
    expect(
      countedInSeries(
        { latitude: -54.82, longitude: -68.3201, type: null },
        staticSources,
      ),
    ).toBe(true);
    expect(
      countedInSeries(
        { latitude: -54.8201, longitude: -68.3201, type: null },
        staticSources,
      ),
    ).toBe(false);
    expect(
      countedInSeries(
        { latitude: 10.50999, longitude: 20.25001, type: null },
        staticSources,
      ),
    ).toBe(false);
  });
});

describe("pipeline coverage", () => {
  it("reads the last day and the last closed day", () => {
    expect(coverage).toMatchObject({
      lastDataDate: "2026-11-14",
      completeDate: "2026-11-13",
      completeDateFromPipeline: true,
    });
    expect(coverage.spans.get("viirs_snpp")).toEqual({
      first: "2012-01-20",
      last: "2026-11-02",
    });
  });

  it("switches from S-NPP to NOAA-20 after the last S-NPP month", () => {
    expect(layerForMonth("2011-12", coverage)).toBe("modis");
    expect(layerForMonth("2012-01", coverage)).toBe("viirs_snpp");
    expect(layerForMonth("2026-10", coverage)).toBe("viirs_snpp");
    expect(layerForMonth("2026-11", coverage)).toBe("viirs_noaa20");
  });

  it("names the days after the last closed day as partial", () => {
    const week = presetPeriod("7d", "2026-11-14");
    expect(week.start).toBe("2026-11-08");
    expect(usesPoints(week, false)).toBe(true);
    expect(usesPoints(week, true)).toBe(false);
    expect(partialDaysLabel(week, coverage.completeDate)).toBe(
      "14 nov ainda parcial",
    );
    expect(
      partialDaysLabel(presetPeriod("7d", "2026-11-13"), coverage.completeDate),
    ).toBeNull();
  });
});

describe("harmonized calendar on the full history", () => {
  function month(key: string, counts: Partial<SeriesMonthRow>) {
    return {
      month: key,
      provisional: 0,
      harmonized_source: "",
      ...counts,
    } as SeriesMonthRow;
  }
  const rows = [
    month("2003-08", {
      modis: 10,
      harmonized: 43.79,
      harmonized_source: "modis_x_k",
    }),
    month("2026-10", {
      modis: 5853,
      viirs_snpp: 18619,
      viirs_noaa20: 19590,
      harmonized: 18619,
      harmonized_source: "viirs_snpp",
      provisional: 1,
    }),
    month("2026-11", {
      modis: 2000,
      viirs_snpp: 900,
      viirs_noaa20: 13920,
      harmonized: 13794.72,
      harmonized_source: "viirs_noaa20_x_k20",
      provisional: 1,
    }),
  ];
  const cellOf = (source: "harmonized" | "viirs", key: string) =>
    buildCalendarYears(rows, coverage, source, "all")
      .flatMap((year) => year.cells)
      .find((cell) => cell.key === key)!;

  it("follows the source column of each month", () => {
    expect(cellOf("harmonized", "2003-08")).toMatchObject({
      value: 43.79,
      origin: "modis_x_k",
    });
    expect(cellOf("harmonized", "2026-10")).toMatchObject({
      value: 18619,
      origin: "viirs_snpp_observed",
      provisional: true,
      partial: false,
    });
    expect(cellOf("harmonized", "2026-11")).toMatchObject({
      value: 13794.72,
      origin: "viirs_noaa20_x_k20",
      partial: true,
    });
  });

  it("shows raw NOAA-20 once S-NPP stopped", () => {
    expect(cellOf("viirs", "2026-11")).toMatchObject({
      value: 13920,
      layer: "viirs_noaa20",
    });
    expect(cellOf("viirs", "2026-10").layer).toBe("viirs_snpp");
  });
});

describe("harmonized weight of a point", () => {
  const factors = readBlockFactors([
    { scope: "world", id: "world", k: "4.3794", k20: "0.9910" },
    { scope: "block", id: "-20_-65", k: "3.8055", k20: "0.9781" },
    { scope: "block", id: "-90_-175", k: "4.3794", k20: "" },
  ]);

  it("uses the factor of the 5 degree block", () => {
    expect(blockId(-17.94, -63.2)).toBe("-20_-65");
    const point = { latitude: -17.94, longitude: -63.2 };
    expect(harmonizedWeight({ ...point, layer: "modis" }, factors)).toBe(
      3.8055,
    );
    expect(harmonizedWeight({ ...point, layer: "viirs_noaa20" }, factors)).toBe(
      0.9781,
    );
    expect(harmonizedWeight({ ...point, layer: "viirs_snpp" }, factors)).toBe(
      1,
    );
    expect(
      harmonizedWeight({ ...point, layer: "viirs_noaa21" }, factors),
    ).toBeNull();
  });

  it("falls back to the world factor", () => {
    expect(
      harmonizedWeight(
        { latitude: 45.1, longitude: 10.2, layer: "modis" },
        factors,
      ),
    ).toBe(4.3794);
    expect(
      harmonizedWeight(
        { latitude: -88, longitude: -170, layer: "viirs_noaa20" },
        factors,
      ),
    ).toBe(0.991);
  });
});

describe("sensor picker", () => {
  it("offers a sensor only inside its coverage", () => {
    const week = presetPeriod("7d", "2026-11-14");
    expect(sensorCovers(coverage.spans.get("viirs_snpp"), week)).toBe(false);
    expect(sensorCovers(coverage.spans.get("viirs_noaa20"), week)).toBe(true);
    expect(
      sensorCovers(
        coverage.spans.get("viirs_noaa20"),
        presetPeriod("7d", "2014-12-31"),
      ),
    ).toBe(false);
  });

  it("harmonizes only the sensors with a factor", () => {
    expect(sensorFactor("modis")).toBe("k");
    expect(sensorFactor("viirs_noaa20")).toBe("k20");
    expect(sensorFactor("viirs_snpp")).toBe("one");
    expect(sensorFactor("viirs_noaa21")).toBeNull();
    expect(sensorFactor("landsat")).toBeNull();
  });
});

describe("grid cells of a small island", () => {
  const island: MultiPolygon = {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [-61.07, 13.8],
          [-60.95, 13.72],
          [-60.89, 13.9],
          [-60.93, 14.09],
          [-61.03, 14.0],
          [-61.07, 13.8],
        ],
      ],
    ],
  };
  const cells = shapeCells(island, 0.25);

  it("keeps the cells that touch the island even with the center at sea", () => {
    expect(cellTouchesShape(13.875, -60.875, 0.25, cells)).toBe(true);
    expect(cellTouchesShape(13.875, -61.125, 0.25, cells)).toBe(true);
  });

  it("leaves out the cells of the neighbour islands", () => {
    expect(cellTouchesShape(13.125, -61.125, 0.25, cells)).toBe(false);
    expect(cellTouchesShape(14.625, -60.875, 0.25, cells)).toBe(false);
  });
});

describe("period chosen on the map", () => {
  it("names both years when the range crosses a year", () => {
    expect(dateRangeLabel("2025-01-01", "2026-05-20")).toBe(
      "1 jan 2025-20 mai 2026",
    );
    expect(dateRangeLabel("2026-10-16", "2026-11-14")).toBe(
      "16 out-14 nov 2026",
    );
  });

  it("goes through the address and comes back the same", () => {
    const params = new URLSearchParams({ area: "USA" });
    addPeriodToSearch(params, presetPeriod("30d", "2014-12-31"));
    expect(periodFromSearch(params)).toEqual(presetPeriod("30d", "2014-12-31"));
    const range = new URLSearchParams("from=2025-01-01&to=2026-05-20");
    expect(periodFromSearch(range)).toMatchObject({
      start: "2025-01-01",
      end: "2026-05-20",
      preset: null,
    });
    expect(
      periodFromSearch(new URLSearchParams("from=2026-05-20&to=2025-01-01")),
    ).toBeNull();
  });

  it("keeps the last days moving with new data", () => {
    const chosen = presetPeriod("14d", "2026-11-14");
    expect(anchoredPeriod(chosen, "2026-11-15")).toMatchObject({
      start: "2026-11-02",
      end: "2026-11-15",
    });
    const past = presetPeriod("14d", "2014-12-31");
    expect(anchoredPeriod(past, "2026-11-15")).toEqual(past);
  });
});
