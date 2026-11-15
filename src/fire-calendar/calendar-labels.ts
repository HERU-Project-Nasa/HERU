import {
  type CalendarCell,
  type CalendarPasses,
  type CalendarSource,
  type CellOrigin,
} from "./calendar-matrix";
import type { CalendarAnalysis, MonthRank } from "./calendar-statistics";

export const MONTH_NAMES = [
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
];

export const MONTH_ABBREVIATIONS = MONTH_NAMES.map((name) => name.slice(0, 3));

export const MONTH_INITIALS = MONTH_NAMES.map((name) => name[0].toUpperCase());

export const SOURCE_OPTIONS: { value: CalendarSource; label: string }[] = [
  { value: "harmonized", label: "Harmonizado" },
  { value: "modis", label: "Só MODIS" },
  { value: "viirs", label: "Só VIIRS" },
];

export const PASSES_OPTIONS: { value: CalendarPasses; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "day", label: "Dia" },
  { value: "night", label: "Noite" },
];

export const SOURCE_UNITS: Record<CalendarSource, string> = {
  harmonized: "Focos equivalentes VIIRS por mês (escala S-NPP)",
  modis: "Focos MODIS por mês, brutos",
  viirs: "Focos VIIRS por mês, brutos",
};

export const SOURCE_SHORT_UNITS: Record<CalendarSource, string> = {
  harmonized: "focos equivalentes VIIRS",
  modis: "focos MODIS",
  viirs: "focos VIIRS",
};

export const PASSES_DESCRIPTIONS: Record<CalendarPasses, string> = {
  all: "todas as passagens",
  day: "só passagens de dia",
  night: "só passagens de noite",
};

export const ORIGIN_LABELS: Record<CellOrigin, string> = {
  modis_x_k: "MODIS × k (fator por bloco de 5°)",
  viirs_snpp_observed: "VIIRS S-NPP, observado",
  viirs_noaa20_x_k20: "VIIRS NOAA-20 × k20",
  modis_raw: "MODIS (Terra + Aqua), bruto",
  viirs_snpp_raw: "VIIRS S-NPP, bruto",
  viirs_noaa20_raw: "VIIRS NOAA-20, bruto",
};

const INTEGER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const COMPACT = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatCount(value: number): string {
  return INTEGER.format(Math.round(value));
}

export function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatHotspots(value: number): string {
  return `${formatCount(value)} ${Math.round(value) === 1 ? "foco" : "focos"}`;
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

export function formatDayMonth(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

export function monthTitle(cell: Pick<CalendarCell, "year" | "month">): string {
  return `${MONTH_NAMES[cell.month - 1]} de ${cell.year}`;
}

export function yearsLabel(count: number): string {
  return `${count} ${count === 1 ? "ano" : "anos"}`;
}

export function rankLabel(rank: MonthRank, month: number): string | null {
  return rank.of < 2
    ? null
    : `${rank.rank}º ${MONTH_NAMES[month - 1]} em ${yearsLabel(rank.of)}`;
}

export function monthRangeLabel(months: number[]): string {
  const first = MONTH_NAMES[months[0]];
  const last = MONTH_NAMES[months[months.length - 1]];
  return months.length === 1 ? first : `${first}-${last}`;
}

export function enabledMonthsLabel(enabledMonths: boolean[]): string {
  if (enabledMonths.every(Boolean)) {
    return "jan-dez";
  }
  const chosen = MONTH_ABBREVIATIONS.filter((_, index) => enabledMonths[index]);
  return chosen.length ? chosen.join(", ") : "nenhum mês";
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
      return { text: "igual ao típico", direction: "equal" };
    }
    const amount = `${formatCount(Math.abs(delta))} ${Math.abs(delta) === 1 ? "foco" : "focos"}`;
    return delta > 0
      ? { text: `${amount} acima do típico`, direction: "above" }
      : { text: `${amount} abaixo do típico`, direction: "below" };
  }
  const ratio = value / typical;
  if (ratio >= 2) {
    return { text: `${formatRatio(ratio)}× o típico`, direction: "above" };
  }
  const percent = Math.round((ratio - 1) * 100);
  if (percent === 0) {
    return { text: "igual ao típico", direction: "equal" };
  }
  return percent > 0
    ? { text: `${percent}% acima do típico`, direction: "above" }
    : { text: `${-percent}% abaixo do típico`, direction: "below" };
}

export function noDataReason(source: CalendarSource, cell: CalendarCell) {
  if (source === "viirs" && cell.layer === null) {
    return "Sem dados do VIIRS. O VIIRS começou em janeiro de 2012.";
  }
  if (source === "modis") {
    return "Sem dados do MODIS neste mês.";
  }
  return "Sem dados neste mês.";
}

export function computingReason(cell: CalendarCell): string {
  return cell.layer === "viirs_noaa20"
    ? "Em cálculo: o fator do NOAA-20 ainda não saiu."
    : "O valor harmonizado está em cálculo.";
}

export type CardSummary = { title: string; text: string };

export function sinceLabel(analysis: CalendarAnalysis): string {
  return analysis.lastYear > analysis.lastBaselineYear
    ? `desde ${analysis.firstYear}`
    : `de ${analysis.firstYear} a ${analysis.lastYear}`;
}

export function baselineLabel(analysis: CalendarAnalysis): string {
  return analysis.firstYear >= analysis.lastBaselineYear
    ? `de ${analysis.firstYear}`
    : `de ${analysis.firstYear} a ${analysis.lastBaselineYear}`;
}

export function seasonSummary(analysis: CalendarAnalysis): CardSummary {
  const { season } = analysis;
  if (season) {
    return {
      title: monthRangeLabel(season.months),
      text: `Concentra ${Math.round(season.share * 100)}% dos focos de um ano típico.`,
    };
  }
  return analysis.baselines.every((baseline) => baseline !== null)
    ? {
        title: "Sem temporada",
        text: "Em um ano típico, nenhum mês tem focos.",
      }
    : {
        title: "Ainda sem referência",
        text: "Falta a mediana de algum mês para achar a temporada.",
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
        ? `${formatRatio(record.ratio)}× a mediana dos anos ${baselineLabel(analysis)}, em ${unit}.`
        : `Teve ${formatRatio(record.ratio)}× os focos da mediana dos anos ${baselineLabel(analysis)}.`,
    };
  }
  if (record) {
    return {
      title: String(record.year),
      text: `Teve ${formatHotspots(record.total)}. Um ano típico ${baselineLabel(analysis)} não tem nenhum.`,
    };
  }
  return analysis.completeYears > 0
    ? {
        title: "Sem recorde",
        text: `Nenhum ano ${baselineLabel(analysis)} teve focos nos meses escolhidos.`,
      }
    : {
        title: "Ainda sem anos completos",
        text: `Nenhum ano completo ${sinceLabel(analysis)} tem todos os meses escolhidos com dado.`,
      };
}
