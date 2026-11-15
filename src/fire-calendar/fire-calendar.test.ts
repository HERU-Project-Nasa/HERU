import { describe, expect, it } from "vitest";
import { inLocale } from "@/i18n/locale";
import { readCoverage } from "@/pipeline/pipeline-coverage";
import type { SeriesDayRow, SeriesMonthRow } from "@/pipeline/series-row";
import {
  baselineLabel,
  difference,
  formatHotspots,
  heatRangeLabel,
  recordSummary,
  seasonSummary,
  sinceLabel,
} from "./calendar-labels";
import { buildCalendarYears } from "./calendar-matrix";
import {
  analyzeCalendar,
  criticalSeason,
  isOutlier,
  logBreaks,
  type MonthBaseline,
} from "./calendar-statistics";
import { currentMonthComparison, periodComparison } from "./month-comparison";

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
    expect(coverage.completeDate).toBe("2026-11-13");
    expect(coverage.completeDateFromPipeline).toBe(false);
    const comparison = currentMonthComparison(
      days,
      years,
      analysis,
      "modis",
      "all",
      coverage.completeDate!,
    );
    expect(comparison).toMatchObject({ throughDay: 13, value: 6 * 13 });
    expect(comparison?.typical).toBe(4.5 * 13);
  });

  it("uses the complete date published by the pipeline", () => {
    const declared = readCoverage([
      {
        layer: "viirs_noaa20",
        processing: "nrt",
        first_date: "2026-08-01",
        last_date: "2026-11-14",
        rows: 1,
        updated_at: "",
        complete_date: "2026-11-12",
      },
    ]);
    expect(declared).toMatchObject({
      completeDate: "2026-11-12",
      completeDateFromPipeline: true,
    });
  });

  it("waits for the first complete day of a month", () => {
    expect(
      currentMonthComparison(
        days,
        years,
        analysis,
        "modis",
        "all",
        "2026-10-31",
      ),
    ).toBeNull();
  });
});

describe("chosen date range", () => {
  const years = buildCalendarYears(rows, coverage, "modis", "all");
  const everyMonth = Array(12).fill(true);
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
  const week = { start: "2026-11-08", end: "2026-11-14" };

  it("limits the typical month to the chosen years", () => {
    const recent = analyzeCalendar(
      years,
      years.filter((year) => year.year >= 2024),
      everyMonth,
    );
    expect(recent).toMatchObject({
      firstYear: 2024,
      lastYear: 2026,
      lastBaselineYear: 2025,
      baselineYearCount: 2,
    });
    expect(recent.baselines[10]?.years).toBe(2);
    expect(sinceLabel(recent)).toBe("since 2024");
    expect(inLocale("pt", () => sinceLabel(recent))).toBe("desde 2024");
    const past = analyzeCalendar(
      years,
      years.filter((year) => year.year >= 2010 && year.year <= 2015),
      everyMonth,
    );
    expect(past.lastBaselineYear).toBe(2015);
    expect(sinceLabel(past)).toBe("from 2010 to 2015");
    expect(baselineLabel(past)).toBe("from 2010 to 2015");
    expect(inLocale("pt", () => baselineLabel(past))).toBe("de 2010 a 2015");
  });

  it("compares the map period with the same days of other years", () => {
    const analysis = analyzeCalendar(years, years, everyMonth);
    const comparison = periodComparison(
      days,
      years,
      analysis,
      "modis",
      "all",
      week,
      "2026-11-13",
    );
    expect(comparison).toMatchObject({
      start: "2026-11-08",
      end: "2026-11-13",
      value: 36,
      typical: 27,
      rank: { rank: 1, of: 3 },
      baselineYears: 2,
    });
    const recent = analyzeCalendar(
      years,
      years.filter((year) => year.year >= 2025),
      everyMonth,
    );
    expect(
      periodComparison(days, years, recent, "modis", "all", week, "2026-11-13"),
    ).toMatchObject({ typical: 30, baselineYears: 1, rank: { of: 2 } });
  });

  it("leaves out a period that has no closed day yet", () => {
    const analysis = analyzeCalendar(years, years, everyMonth);
    expect(
      periodComparison(
        days,
        years,
        analysis,
        "modis",
        "all",
        { start: "2026-11-14", end: "2026-11-14" },
        "2026-11-13",
      ),
    ).toBeNull();
  });
});

describe("summaries for areas without fire", () => {
  const quiet = Array.from({ length: 23 * 12 }, (_, index) =>
    row(
      `${2003 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`,
      { modis: index === 30 ? 1 : 0 },
    ),
  );
  const years = buildCalendarYears(quiet, coverage, "modis", "all");
  const analysis = analyzeCalendar(years, years, Array(12).fill(true));

  it("tells a quiet area apart from missing data", () => {
    expect(seasonSummary(analysis).title).toBe("No season");
    expect(recordSummary(analysis)).toEqual({
      title: "2005",
      text: "Had 1 hotspot. A typical year from 2003 to 2025 has none.",
    });
    expect(inLocale("pt", () => recordSummary(analysis))).toEqual({
      title: "2005",
      text: "Teve 1 foco. Um ano típico de 2003 a 2025 não tem nenhum.",
    });
  });

  it("asks for data when no year is complete", () => {
    const empty = analyzeCalendar(
      buildCalendarYears([], coverage, "viirs", "all"),
      [],
      Array(12).fill(true),
    );
    expect(seasonSummary(empty).title).toBe("No baseline yet");
    expect(recordSummary(empty).title).toBe("No complete years yet");
    expect(inLocale("pt", () => seasonSummary(empty).title)).toBe(
      "Ainda sem referência",
    );
  });
});

describe("labels", () => {
  it("describes the difference to the typical month", () => {
    expect(difference(138, 100).text).toBe("38% above typical");
    expect(difference(280, 100).text).toBe("2.8× typical");
    expect(difference(4, 12).text).toBe("8 hotspots below typical");
    inLocale("pt", () => {
      expect(difference(138, 100).text).toBe("38% acima do típico");
      expect(difference(280, 100).text).toBe("2,8× o típico");
      expect(difference(4, 12).text).toBe("8 focos abaixo do típico");
    });
  });

  it("writes one hotspot in the singular", () => {
    expect(formatHotspots(1)).toBe("1 hotspot");
    expect(formatHotspots(0.6)).toBe("1 hotspot");
    expect(formatHotspots(1349)).toBe("1,349 hotspots");
    inLocale("pt", () => {
      expect(formatHotspots(1)).toBe("1 foco");
      expect(formatHotspots(1349)).toBe("1.349 focos");
    });
  });

  it("shares the unit across a heat range", () => {
    expect(heatRangeLabel(1000, 3000)).toBe("1K-3K");
    expect(heatRangeLabel(null, 1000)).toBe("< 1K");
    inLocale("pt", () => {
      expect(heatRangeLabel(1000, 3000)).toBe("1-3 mil");
      expect(heatRangeLabel(null, 1000)).toBe("< 1 mil");
    });
  });
});
