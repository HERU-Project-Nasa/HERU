import { capitalized } from "@/fire-calendar/calendar-labels";
import type {
  CalendarPasses,
  CalendarSource,
  CalendarYear,
} from "@/fire-calendar/calendar-matrix";
import type { PeriodReport } from "@/fire-calendar/calendar-reports";
import type { CalendarAnalysis } from "@/fire-calendar/calendar-statistics";
import { periodComparison } from "@/fire-calendar/month-comparison";
import { tr } from "@/i18n/locale";
import type { SeriesDayRow } from "@/pipeline/series-row";
import {
  dateRangeLabel,
  type MapPeriod,
  partialDaysLabel,
  periodLabel,
  periodName,
} from "./map-period";

export function periodReport(
  dailyRows: SeriesDayRow[],
  years: CalendarYear[],
  analysis: CalendarAnalysis,
  source: CalendarSource,
  passes: CalendarPasses,
  period: MapPeriod,
  completeDate: string,
): PeriodReport | null {
  const comparison = periodComparison(
    dailyRows,
    years,
    analysis,
    source,
    passes,
    period,
    completeDate,
  );
  if (!comparison) {
    return null;
  }
  const partial = partialDaysLabel(period, completeDate);
  return {
    comparison,
    eyebrow: periodName(period),
    title: periodLabel({
      ...period,
      start: comparison.start,
      end: comparison.end,
      hours: null,
    }),
    dates: dateRangeLabel(comparison.start, comparison.end),
    note:
      [
        partial &&
          tr(
            `${capitalized(partial)}, left out of the comparison.`,
            `${capitalized(partial)}, fora da comparação.`,
          ),
        period.hours &&
          tr("We count whole UTC days.", "Contamos dias UTC inteiros."),
      ]
        .filter(Boolean)
        .join(" ") || null,
  };
}
