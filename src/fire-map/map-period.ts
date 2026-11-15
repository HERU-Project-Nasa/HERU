import {
  lastDayOfMonth,
  VIIRS_FIRST_MONTH,
  viirsLayerFor,
} from "@/fire-calendar/calendar-matrix";
import type { SymbolName } from "@/icons/material-symbols";
import type { PipelineCoverage } from "@/pipeline/pipeline-coverage";
import type { SeriesLayer } from "@/pipeline/series-row";

export type PeriodPreset = "24h" | "48h" | "7d" | "14d" | "30d";

export type MapPeriod = {
  start: string;
  end: string;
  hours: number | null;
  preset: PeriodPreset | null;
  seasonKey: string | null;
};

export type SeasonId = "summer" | "autumn" | "winter" | "spring";

export type Season = {
  key: string;
  id: SeasonId;
  name: string;
  icon: SymbolName;
  months: string[];
  monthsLabel: string;
};

export const POINT_DAYS_LIMIT = 7;
export const WORLD_POINT_DAYS_LIMIT = 2;

export const PERIOD_PRESETS: {
  value: PeriodPreset;
  label: string;
  days: number;
  hours: number | null;
}[] = [
  { value: "24h", label: "24 h", days: 2, hours: 24 },
  { value: "48h", label: "48 h", days: 3, hours: 48 },
  { value: "7d", label: "7 dias", days: 7, hours: null },
  { value: "14d", label: "14 dias", days: 14, hours: null },
  { value: "30d", label: "30 dias", days: 30, hours: null },
];

const SEASON_LOOKS: Record<SeasonId, { name: string; icon: SymbolName }> = {
  summer: { name: "Verão", icon: "sunny" },
  autumn: { name: "Outono", icon: "eco" },
  winter: { name: "Inverno", icon: "ac_unit" },
  spring: { name: "Primavera", icon: "local_florist" },
};

const SOUTHERN_ORDER: SeasonId[] = ["summer", "autumn", "winter", "spring"];
const NORTHERN_ORDER: SeasonId[] = ["winter", "spring", "summer", "autumn"];
const MONTH_ABBREVIATIONS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function addDays(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

export function periodDates(period: MapPeriod): string[] {
  const dates: string[] = [];
  for (let date = period.start; date <= period.end; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export function periodMonths(period: MapPeriod): string[] {
  return [...new Set(periodDates(period).map((date) => date.slice(0, 7)))];
}

export function presetPeriod(preset: PeriodPreset, end: string): MapPeriod {
  const option = PERIOD_PRESETS.find(
    (candidate) => candidate.value === preset,
  )!;
  return {
    start: addDays(end, 1 - option.days),
    end,
    hours: option.hours,
    preset,
    seasonKey: null,
  };
}

export function yearPeriodEnd(year: number, lastDataDate: string): string {
  const yearEnd = `${year}-12-31`;
  return yearEnd < lastDataDate ? yearEnd : lastDataDate;
}

export function periodName(period: MapPeriod): string {
  if (period.hours) {
    return `Últimas ${period.hours} h`;
  }
  if (period.preset) {
    return `Últimos ${periodDates(period).length} dias`;
  }
  return period.seasonKey ? "Estação escolhida" : "Período escolhido";
}

export function usesPoints(period: MapPeriod, world: boolean): boolean {
  return (
    periodDates(period).length <=
    (world ? WORLD_POINT_DAYS_LIMIT + 1 : POINT_DAYS_LIMIT)
  );
}

export function layerForMonth(
  month: string,
  coverage: PipelineCoverage,
): SeriesLayer {
  return month < VIIRS_FIRST_MONTH
    ? "modis"
    : (viirsLayerFor(month, coverage) ?? "modis");
}

function dayLabel(date: string): string {
  return `${Number(date.slice(8, 10))} ${MONTH_ABBREVIATIONS[Number(date.slice(5, 7)) - 1]}`;
}

export function periodLabel(period: MapPeriod): string {
  if (period.hours) {
    return `Últimas ${period.hours} h até ${dayLabel(period.end)} ${period.end.slice(0, 4)}`;
  }
  const days = periodDates(period).length;
  return `${dateRangeLabel(period.start, period.end)} · ${days} ${days === 1 ? "dia" : "dias"}`;
}

export function dateRangeLabel(start: string, end: string): string {
  const range =
    start === end ? dayLabel(end) : `${dayLabel(start)}-${dayLabel(end)}`;
  return `${range} ${end.slice(0, 4)}`;
}

export function partialDaysLabel(
  period: MapPeriod,
  completeDate: string | null,
): string | null {
  if (!completeDate || period.end <= completeDate) {
    return null;
  }
  const first =
    period.start > completeDate ? period.start : addDays(completeDate, 1);
  return first === period.end
    ? `${dayLabel(first)} ainda parcial`
    : `${dayLabel(first)}-${dayLabel(period.end)} ainda parciais`;
}

export function monthsLabel(months: string[]): string {
  const names = months.map(
    (month) =>
      `${MONTH_ABBREVIATIONS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`,
  );
  return names.length > 2
    ? `${names[0]} a ${names[names.length - 1]}`
    : names.join(" e ");
}

export function seasonsOf(year: number, southern: boolean): Season[] {
  const order = southern ? SOUTHERN_ORDER : NORTHERN_ORDER;
  return order.map((id, index) => {
    const firstMonth = index * 3;
    const months = [-1, 0, 1].map((offset) => {
      const month = firstMonth + offset;
      return month < 0
        ? `${year - 1}-12`
        : `${year}-${String(month + 1).padStart(2, "0")}`;
    });
    const first = Number(months[0].slice(5, 7)) - 1;
    const last = Number(months[2].slice(5, 7)) - 1;
    return {
      key: `${year}-${id}`,
      id,
      ...SEASON_LOOKS[id],
      months,
      monthsLabel: `${MONTH_ABBREVIATIONS[first]}-${MONTH_ABBREVIATIONS[last]}`,
    };
  });
}

export function seasonPeriod(season: Season, lastDataDate: string): MapPeriod {
  const end = lastDayOfMonth(season.months[2]);
  return {
    start: `${season.months[0]}-01`,
    end: end < lastDataDate ? end : lastDataDate,
    hours: null,
    preset: null,
    seasonKey: season.key,
  };
}
