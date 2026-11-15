import { localDateFormat, localNumberFormat } from "@/i18n/format";
import { currentLocale, localized, tr } from "@/i18n/locale";
import {
  type CalendarCell,
  type CalendarPasses,
  type CalendarSource,
  type CellOrigin,
} from "./calendar-matrix";
import type { CalendarAnalysis, MonthRank } from "./calendar-statistics";

export const MONTH_NAMES = localized(
  [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ],
);

export const MONTH_ABBREVIATIONS = localized(
  [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  [
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
  ],
);

export const MONTH_INITIALS = localized(
  ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
);

export const SOURCE_OPTIONS: { value: CalendarSource; label: string }[] =
  localized(
    [
      { value: "harmonized", label: "Harmonized" },
      { value: "modis", label: "MODIS only" },
      { value: "viirs", label: "VIIRS only" },
    ],
    [
      { value: "harmonized", label: "Harmonizado" },
      { value: "modis", label: "Só MODIS" },
      { value: "viirs", label: "Só VIIRS" },
    ],
  );

export const PASSES_OPTIONS: { value: CalendarPasses; label: string }[] =
  localized(
    [
      { value: "all", label: "All" },
      { value: "day", label: "Day" },
      { value: "night", label: "Night" },
    ],
    [
      { value: "all", label: "Todas" },
      { value: "day", label: "Dia" },
      { value: "night", label: "Noite" },
    ],
  );

export const SOURCE_UNITS: Record<CalendarSource, string> = localized(
  {
    harmonized: "VIIRS-equivalent hotspots per month (S-NPP scale)",
    modis: "MODIS hotspots per month, raw",
    viirs: "VIIRS hotspots per month, raw",
  },
  {
    harmonized: "Focos equivalentes VIIRS por mês (escala S-NPP)",
    modis: "Focos MODIS por mês, brutos",
    viirs: "Focos VIIRS por mês, brutos",
  },
);

export const SOURCE_SHORT_UNITS: Record<CalendarSource, string> = localized(
  {
    harmonized: "VIIRS-equivalent hotspots",
    modis: "MODIS hotspots",
    viirs: "VIIRS hotspots",
  },
  {
    harmonized: "focos equivalentes VIIRS",
    modis: "focos MODIS",
    viirs: "focos VIIRS",
  },
);

export const PASSES_DESCRIPTIONS: Record<CalendarPasses, string> = localized(
  {
    all: "all overpasses",
    day: "daytime overpasses only",
    night: "nighttime overpasses only",
  },
  {
    all: "todas as passagens",
    day: "só passagens de dia",
    night: "só passagens de noite",
  },
);

export const ORIGIN_LABELS: Record<CellOrigin, string> = localized(
  {
    modis_x_k: "MODIS × k (factor per 5° block)",
    viirs_snpp_observed: "VIIRS S-NPP, as observed",
    viirs_noaa20_x_k20: "VIIRS NOAA-20 × k20",
    modis_raw: "MODIS (Terra + Aqua), raw",
    viirs_snpp_raw: "VIIRS S-NPP, raw",
    viirs_noaa20_raw: "VIIRS NOAA-20, raw",
  },
  {
    modis_x_k: "MODIS × k (fator por bloco de 5°)",
    viirs_snpp_observed: "VIIRS S-NPP, observado",
    viirs_noaa20_x_k20: "VIIRS NOAA-20 × k20",
    modis_raw: "MODIS (Terra + Aqua), bruto",
    viirs_snpp_raw: "VIIRS S-NPP, bruto",
    viirs_noaa20_raw: "VIIRS NOAA-20, bruto",
  },
);

const INTEGER = localNumberFormat({ maximumFractionDigits: 0 });
const DECIMAL = localNumberFormat({
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const COMPACT = localNumberFormat({
  notation: "compact",
  maximumFractionDigits: 1,
});
const DATE_TIME = localDateFormat({
  dateStyle: "short",
  timeStyle: "short",
});
const ENGLISH_ORDINALS = new Intl.PluralRules("en-US", { type: "ordinal" });
const ENGLISH_SUFFIXES: Record<string, string> = {
  one: "st",
  two: "nd",
  few: "rd",
  other: "th",
};

/** 1st, 2nd, 3rd in English; 1º, 2º, 3º in Portuguese. */
export function ordinal(value: number): string {
  return currentLocale() === "pt"
    ? `${value}º`
    : `${value}${ENGLISH_SUFFIXES[ENGLISH_ORDINALS.select(value)]}`;
}

export function formatCount(value: number): string {
  return INTEGER.format(Math.round(value));
}

export function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "hotspot" or "hotspots" ("foco" or "focos"), agreeing with the count. */
export function hotspotsWord(value: number): string {
  return Math.round(Math.abs(value)) === 1
    ? tr("hotspot", "foco")
    : tr("hotspots", "focos");
}

export function formatHotspots(value: number): string {
  return `${formatCount(value)} ${hotspotsWord(value)}`;
}

export function formatCompact(value: number): string {
  return COMPACT.format(value);
}

export function formatRatio(value: number): string {
  return DECIMAL.format(value);
}

export function formatUpdatedAt(timestamp: string): string {
  return DATE_TIME.format(new Date(timestamp));
}

/** A day of the year from an ISO date: "Nov 13" in English, "13/11" in Portuguese. */
export function formatDayMonth(date: string): string {
  return tr(
    `${MONTH_ABBREVIATIONS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}`,
    `${date.slice(8, 10)}/${date.slice(5, 7)}`,
  );
}

/** A full ISO date: "Nov 13, 2026" in English, "13/11/2026" in Portuguese. */
export function formatFullDate(date: string): string {
  return tr(
    `${formatDayMonth(date)}, ${date.slice(0, 4)}`,
    `${formatDayMonth(date)}/${date.slice(0, 4)}`,
  );
}

export function monthTitle(cell: Pick<CalendarCell, "year" | "month">): string {
  return tr(
    `${MONTH_NAMES[cell.month - 1]} ${cell.year}`,
    `${MONTH_NAMES[cell.month - 1]} de ${cell.year}`,
  );
}

export function yearsLabel(count: number): string {
  return count === 1
    ? tr(`${count} year`, `${count} ano`)
    : tr(`${count} years`, `${count} anos`);
}

export function monthsLabel(count: number): string {
  return count === 1
    ? tr(`${count} month`, `${count} mês`)
    : tr(`${count} months`, `${count} meses`);
}

export function rankLabel(rank: MonthRank, month: number): string | null {
  return rank.of < 2
    ? null
    : tr(
        `${ordinal(rank.rank)} busiest ${MONTH_NAMES[month - 1]} in ${yearsLabel(rank.of)}`,
        `${ordinal(rank.rank)} ${MONTH_NAMES[month - 1]} em ${yearsLabel(rank.of)}`,
      );
}

export function monthRangeLabel(months: number[]): string {
  const first = MONTH_NAMES[months[0]];
  const last = MONTH_NAMES[months[months.length - 1]];
  return months.length === 1 ? first : `${first}-${last}`;
}

export function enabledMonthsLabel(enabledMonths: boolean[]): string {
  if (enabledMonths.every(Boolean)) {
    return tr("Jan-Dec", "jan-dez");
  }
  const chosen = MONTH_ABBREVIATIONS.filter((_, index) => enabledMonths[index]);
  return chosen.length ? chosen.join(", ") : tr("no months", "nenhum mês");
}

export function heatRangeLabel(lower: number | null, upper: number | null) {
  if (lower === null && upper !== null) {
    return `< ${formatCompact(upper)}`;
  }
  if (upper === null && lower !== null) {
    return `≥ ${formatCompact(lower)}`;
  }
  if (lower === null || upper === null) {
    return "> 0";
  }
  const from = formatCompact(lower);
  const to = formatCompact(upper);
  const unit = to.match(/\s\D+$/)?.[0];
  return unit && from.endsWith(unit)
    ? `${from.slice(0, -unit.length)}-${to}`
    : `${from}-${to}`;
}

export type Difference = {
  text: string;
  direction: "above" | "below" | "equal";
};

export function difference(value: number, typical: number): Difference {
  if (typical < 20) {
    const delta = Math.round(value - typical);
    if (delta === 0) {
      return {
        text: tr("same as typical", "igual ao típico"),
        direction: "equal",
      };
    }
    const amount = formatHotspots(Math.abs(delta));
    return delta > 0
      ? {
          text: tr(`${amount} above typical`, `${amount} acima do típico`),
          direction: "above",
        }
      : {
          text: tr(`${amount} below typical`, `${amount} abaixo do típico`),
          direction: "below",
        };
  }
  const ratio = value / typical;
  if (ratio >= 2) {
    return {
      text: tr(
        `${formatRatio(ratio)}× typical`,
        `${formatRatio(ratio)}× o típico`,
      ),
      direction: "above",
    };
  }
  const percent = Math.round((ratio - 1) * 100);
  if (percent === 0) {
    return {
      text: tr("same as typical", "igual ao típico"),
      direction: "equal",
    };
  }
  return percent > 0
    ? {
        text: tr(`${percent}% above typical`, `${percent}% acima do típico`),
        direction: "above",
      }
    : {
        text: tr(`${-percent}% below typical`, `${-percent}% abaixo do típico`),
        direction: "below",
      };
}

export function noDataReason(source: CalendarSource, cell: CalendarCell) {
  if (source === "viirs" && cell.layer === null) {
    return tr(
      "No VIIRS data. VIIRS began in January 2012.",
      "Sem dados do VIIRS. O VIIRS começou em janeiro de 2012.",
    );
  }
  if (source === "modis") {
    return tr("No MODIS data for this month.", "Sem dados do MODIS neste mês.");
  }
  return tr("No data for this month.", "Sem dados neste mês.");
}

export function computingReason(cell: CalendarCell): string {
  return cell.layer === "viirs_noaa20"
    ? tr(
        "Being computed: the NOAA-20 factor is not out yet.",
        "Em cálculo: o fator do NOAA-20 ainda não saiu.",
      )
    : tr(
        "The harmonized value is still being computed.",
        "O valor harmonizado está em cálculo.",
      );
}

export type CardSummary = { title: string; text: string };

export function sinceLabel(analysis: CalendarAnalysis): string {
  return analysis.lastYear > analysis.lastBaselineYear
    ? tr(`since ${analysis.firstYear}`, `desde ${analysis.firstYear}`)
    : tr(
        `from ${analysis.firstYear} to ${analysis.lastYear}`,
        `de ${analysis.firstYear} a ${analysis.lastYear}`,
      );
}

export function baselineLabel(analysis: CalendarAnalysis): string {
  return analysis.firstYear >= analysis.lastBaselineYear
    ? tr(`for ${analysis.firstYear}`, `de ${analysis.firstYear}`)
    : tr(
        `from ${analysis.firstYear} to ${analysis.lastBaselineYear}`,
        `de ${analysis.firstYear} a ${analysis.lastBaselineYear}`,
      );
}

export function seasonSummary(analysis: CalendarAnalysis): CardSummary {
  const { season } = analysis;
  if (season) {
    return {
      title: monthRangeLabel(season.months),
      text: tr(
        `Holds ${Math.round(season.share * 100)}% of a typical year's hotspots.`,
        `Concentra ${Math.round(season.share * 100)}% dos focos de um ano típico.`,
      ),
    };
  }
  return analysis.baselines.every((baseline) => baseline !== null)
    ? {
        title: tr("No season", "Sem temporada"),
        text: tr(
          "In a typical year, no month has hotspots.",
          "Em um ano típico, nenhum mês tem focos.",
        ),
      }
    : {
        title: tr("No baseline yet", "Ainda sem referência"),
        text: tr(
          "A month's median is still missing, so the season cannot be found.",
          "Falta a mediana de algum mês para achar a temporada.",
        ),
      };
}

export function recordSummary(
  analysis: CalendarAnalysis,
  unit?: string,
): CardSummary {
  const { record } = analysis;
  if (record && record.ratio !== null) {
    return {
      title: String(record.year),
      text: unit
        ? tr(
            `${formatRatio(record.ratio)}× the median year ${baselineLabel(analysis)}, in ${unit}.`,
            `${formatRatio(record.ratio)}× a mediana dos anos ${baselineLabel(analysis)}, em ${unit}.`,
          )
        : tr(
            `Had ${formatRatio(record.ratio)}× the hotspots of the median year ${baselineLabel(analysis)}.`,
            `Teve ${formatRatio(record.ratio)}× os focos da mediana dos anos ${baselineLabel(analysis)}.`,
          ),
    };
  }
  if (record) {
    return {
      title: String(record.year),
      text: tr(
        `Had ${formatHotspots(record.total)}. A typical year ${baselineLabel(analysis)} has none.`,
        `Teve ${formatHotspots(record.total)}. Um ano típico ${baselineLabel(analysis)} não tem nenhum.`,
      ),
    };
  }
  return analysis.completeYears > 0
    ? {
        title: tr("No record", "Sem recorde"),
        text: tr(
          `No year ${baselineLabel(analysis)} had hotspots in the chosen months.`,
          `Nenhum ano ${baselineLabel(analysis)} teve focos nos meses escolhidos.`,
        ),
      }
    : {
        title: tr("No complete years yet", "Ainda sem anos completos"),
        text: tr(
          `No complete year ${sinceLabel(analysis)} has data for every chosen month.`,
          `Nenhum ano completo ${sinceLabel(analysis)} tem todos os meses escolhidos com dado.`,
        ),
      };
}
