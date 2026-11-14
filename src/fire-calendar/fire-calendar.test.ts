import { describe, expect, it } from "vitest";
import { readCoverage } from "@/pipeline/pipeline-coverage";
import type { SeriesDayRow, SeriesMonthRow } from "@/pipeline/series-row";
import { difference, heatRangeLabel } from "./calendar-labels";
import { buildCalendarYears } from "./calendar-matrix";
import {
  analyzeCalendar,
  criticalSeason,
  isOutlier,
  logBreaks,
  type MonthBaseline,
} from "./calendar-statistics";
import { currentMonthComparison } from "./month-comparison";

const coverage = readCoverage([
  {
    layer: "modis",
    processing: "sp",
    first_date: "2000-11-01",
    last_date: "2026-08-31",
    rows: 1,
    updated_at: "",
  },
  {
    layer: "modis",
    processing: "nrt",
    first_date: "2026-09-01",
    last_date: "2026-11-14",
    rows: 1,
    updated_at: "",
  },
  {
    layer: "viirs_noaa20",
    processing: "nrt",
    first_date: "2026-08-01",
    last_date: "2026-11-14",
    rows: 1,
    updated_at: "",
  },
]);

function row(month: string, counts: Partial<SeriesMonthRow>): SeriesMonthRow {
  return {
    month,
    harmonized_source: "",
    provisional: 0,
    ...counts,
  } as SeriesMonthRow;
}

const rows = [
  row("2005-09", { modis: 1200, harmonized: null }),
  row("2005-10", { modis: 0, harmonized: null }),
  row("2015-09", { modis: 900, viirs_snpp: null, harmonized: null }),
  row("2026-11", {
    modis: 3248,
    viirs_noaa20: 13920,
    harmonized: null,
    provisional: 1,
  }),
];

function baseline(median: number, p90: number): MonthBaseline {
  return { years: 23, median, mean: median, p25: median, p75: median, p90 };
}

describe("buildCalendarYears", () => {
  const harmonized = buildCalendarYears(rows, coverage, "harmonized", "all");
  const cell = (key: string) =>
    harmonized.flatMap((year) => year.cells).find((item) => item.key === key)!;

  it("marks MODIS months without a factor as computing", () => {
    expect(cell("2005-09").state).toBe("computing");
  });

  it("marks months of a layer that is still loading", () => {
    expect(cell("2015-09").state).toBe("loading");
  });

  it("marks the last month as partial and the next as future", () => {
    expect(cell("2026-11")).toMatchObject({
      state: "computing",
      partial: true,
      provisional: true,
      layer: "viirs_noaa20",
    });
    expect(cell("2026-12").state).toBe("future");
  });

  it("reads zero and VIIRS gaps in the raw sources", () => {
    const modis = buildCalendarYears(rows, coverage, "modis", "all");
    expect(modis[2].cells[9]).toMatchObject({ state: "zero", value: 0 });
    const viirs = buildCalendarYears(rows, coverage, "viirs", "all");
    expect(viirs[2].cells[8].state).toBe("no-data");
    expect(viirs.at(-1)!.cells[10]).toMatchObject({
      state: "value",
      value: 13920,
      origin: "viirs_noaa20_raw",
    });
  });
});

describe("statistics", () => {
  it("builds increasing log breaks on round numbers", () => {
    const breaks = logBreaks([3, 40, 800, 2500, 96000]);
    expect(breaks).toHaveLength(5);
    for (let index = 1; index < breaks.length; index++) {
      expect(breaks[index]).toBeGreaterThan(breaks[index - 1]);
    }
    for (const limit of breaks) {
      const leading = limit / 10 ** Math.floor(Math.log10(limit));
      expect([1, 3]).toContain(Math.round(leading));
    }
    expect(logBreaks([5, 5, 5])).toEqual([]);
  });

  it("finds a fire season that crosses December", () => {
    const medians = [30, 20, 1, 1, 1, 1, 1, 1, 1, 1, 10, 40];
    const season = criticalSeason(medians.map((value) => baseline(value, 0)));
    expect(season?.months).toEqual([11, 0, 1]);
  });

  it("requires all four outlier conditions", () => {
    const [cell] = buildCalendarYears(
      [row("2003-01", { modis: 50 })],
      coverage,
      "modis",
      "all",
    )[0].cells;
    expect(isOutlier(cell, baseline(20, 40), true)).toBe(true);
    expect(isOutlier(cell, baseline(30, 40), true)).toBe(false);
    expect(isOutlier(cell, baseline(20, 60), true)).toBe(false);
    expect(isOutlier(cell, baseline(20, 40), false)).toBe(false);
  });
});

describe("currentMonthComparison", () => {
  const years = buildCalendarYears(rows, coverage, "modis", "all");
  const analysis = analyzeCalendar(years, years, Array(12).fill(true));
  const days: SeriesDayRow[] = [2024, 2025, 2026].flatMap((year) =>
    Array.from(
      { length: 14 },
      (_, index) =>
        ({
          date: `${year}-11-${String(index + 1).padStart(2, "0")}`,
          modis: index === 13 ? 1000 : year - 2020,
        }) as SeriesDayRow,
    ),
  );

  it("stops at the last complete day", () => {
    const comparison = currentMonthComparison(
      days,
      years,
      analysis,
      "modis",
      "all",
      "2026-11-14",
    );
    expect(comparison).toMatchObject({ throughDay: 13, value: 6 * 13 });
    expect(comparison?.typical).toBe(4.5 * 13);
  });

  it("waits for the first complete day of a month", () => {
    expect(
      currentMonthComparison(
        days,
        years,
        analysis,
        "modis",
        "all",
        "2026-11-01",
      ),
    ).toBeNull();
  });
});

describe("labels", () => {
  it("describes the difference to the typical month", () => {
    expect(difference(138, 100).text).toBe("38% acima do típico");
    expect(difference(280, 100).text).toBe("2,8× o típico");
    expect(difference(4, 12).text).toBe("8 focos abaixo do típico");
  });

  it("shares the unit across a heat range", () => {
    expect(heatRangeLabel(1000, 3000)).toBe("1-3 mil");
    expect(heatRangeLabel(null, 1000)).toBe("< 1 mil");
  });
});
