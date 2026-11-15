import { MONTH_ABBREVIATIONS } from "@/fire-calendar/calendar-labels";
import {
  lastDayOfMonth,
  VIIRS_FIRST_MONTH,
  viirsLayerFor,
} from "@/fire-calendar/calendar-matrix";
import { localized, tr } from "@/i18n/locale";
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
}[] = localized(
  [
    { value: "24h", label: "24 h", days: 2, hours: 24 },
    { value: "48h", label: "48 h", days: 3, hours: 48 },
    { value: "7d", label: "7 days", days: 7, hours: null },
    { value: "14d", label: "14 days", days: 14, hours: null },
    { value: "30d", label: "30 days", days: 30, hours: null },
  ],
  [
    { value: "24h", label: "24 h", days: 2, hours: 24 },
    { value: "48h", label: "48 h", days: 3, hours: 48 },
    { value: "7d", label: "7 dias", days: 7, hours: null },
    { value: "14d", label: "14 dias", days: 14, hours: null },
    { value: "30d", label: "30 dias", days: 30, hours: null },
  ],
);

const SEASON_LOOKS: Record<SeasonId, { name: string; icon: SymbolName }> =
  localized(
    {
      summer: { name: "Summer", icon: "sunny" },
      autumn: { name: "Autumn", icon: "eco" },
      winter: { name: "Winter", icon: "ac_unit" },
      spring: { name: "Spring", icon: "local_florist" },
    },
    {
      summer: { name: "Verão", icon: "sunny" },
      autumn: { name: "Outono", icon: "eco" },
      winter: { name: "Inverno", icon: "ac_unit" },
      spring: { name: "Primavera", icon: "local_florist" },
    },
  );

const SOUTHERN_ORDER: SeasonId[] = ["summer", "autumn", "winter", "spring"];
const NORTHERN_ORDER: SeasonId[] = ["winter", "spring", "summer", "autumn"];

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
    return tr(`Last ${period.hours} h`, `Últimas ${period.hours} h`);
  }
  if (period.preset) {
    const days = periodDates(period).length;
    return tr(`Last ${days} days`, `Últimos ${days} dias`);
  }
  return period.seasonKey
    ? tr("Selected season", "Estação escolhida")
    : tr("Selected period", "Período escolhido");
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

/** "Nov 14" in English, "14 nov" in Portuguese. */
function dayLabel(date: string): string {
  const day = Number(date.slice(8, 10));
  const month = MONTH_ABBREVIATIONS[Number(date.slice(5, 7)) - 1];
  return tr(`${month} ${day}`, `${day} ${month}`);
}

/** "Nov 14, 2026" in English, "14 nov 2026" in Portuguese. */
function dayYearLabel(date: string): string {
  return tr(
    `${dayLabel(date)}, ${date.slice(0, 4)}`,
    `${dayLabel(date)} ${date.slice(0, 4)}`,
  );
}

export function periodLabel(period: MapPeriod): string {
  if (period.hours) {
    return tr(
      `Last ${period.hours} h up to ${dayYearLabel(period.end)}`,
      `Últimas ${period.hours} h até ${dayYearLabel(period.end)}`,
    );
  }
  const days = periodDates(period).length;
  const range = dateRangeLabel(period.start, period.end);
  return tr(
    `${range} · ${days} ${days === 1 ? "day" : "days"}`,
    `${range} · ${days} ${days === 1 ? "dia" : "dias"}`,
  );
}

export function dateRangeLabel(start: string, end: string): string {
  if (start.slice(0, 4) !== end.slice(0, 4)) {
    return tr(
      `${dayYearLabel(start)} - ${dayYearLabel(end)}`,
      `${dayYearLabel(start)}-${dayYearLabel(end)}`,
    );
  }
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const range =
    start === end
      ? dayLabel(end)
      : tr(
          sameMonth
            ? `${dayLabel(start)}-${Number(end.slice(8, 10))}`
            : `${dayLabel(start)}-${dayLabel(end)}`,
          `${dayLabel(start)}-${dayLabel(end)}`,
        );
  return tr(`${range}, ${end.slice(0, 4)}`, `${range} ${end.slice(0, 4)}`);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function periodFromSearch(params: URLSearchParams): MapPeriod | null {
  const start = params.get("from");
  const end = params.get("to");
  if (
    !start ||
    !end ||
    !DATE_PATTERN.test(start) ||
    !DATE_PATTERN.test(end) ||
    start > end
  ) {
    return null;
  }
  const preset = PERIOD_PRESETS.find(
    (option) => option.value === params.get("preset"),
  );
  return {
    start,
    end,
    hours: preset?.hours ?? null,
    preset: preset?.value ?? null,
    seasonKey: preset ? null : params.get("season"),
  };
}

export function addPeriodToSearch(
  params: URLSearchParams,
  period: MapPeriod | null,
) {
  if (!period) {
    return;
  }
  params.set("from", period.start);
  params.set("to", period.end);
  if (period.preset) {
    params.set("preset", period.preset);
  } else if (period.seasonKey) {
    params.set("season", period.seasonKey);
  }
}

export function anchoredPeriod(
  period: MapPeriod,
  lastDataDate: string,
): MapPeriod {
  return period.preset
    ? presetPeriod(
        period.preset,
        yearPeriodEnd(Number(period.end.slice(0, 4)), lastDataDate),
      )
    : period;
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
  if (first === period.end) {
    return tr(
      `${dayLabel(first)} still partial`,
      `${dayLabel(first)} ainda parcial`,
    );
  }
  const range = `${dayLabel(first)}-${dayLabel(period.end)}`;
  return tr(`${range} still partial`, `${range} ainda parciais`);
}

export function monthsLabel(months: string[]): string {
  const names = months.map(
    (month) =>
      `${MONTH_ABBREVIATIONS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`,
  );
  return names.length > 2
    ? tr(
        `${names[0]}-${names[names.length - 1]}`,
        `${names[0]} a ${names[names.length - 1]}`,
      )
    : names.join(tr(" and ", " e "));
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
