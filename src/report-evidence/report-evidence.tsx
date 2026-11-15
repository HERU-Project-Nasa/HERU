"use client";

import type { ReactNode } from "react";
import {
  baselineLabel,
  capitalized,
  difference,
  enabledMonthsLabel,
  formatCount,
  formatHotspots,
  formatRatio,
  hotspotsWord,
  MONTH_NAMES,
  monthRangeLabel,
  monthsLabel,
  monthTitle,
  ordinal,
  PASSES_DESCRIPTIONS,
  sinceLabel,
  SOURCE_SHORT_UNITS,
  yearsLabel,
} from "@/fire-calendar/calendar-labels";
import type { CalendarCell } from "@/fire-calendar/calendar-matrix";
import type {
  PeriodReport,
  ReportKind,
} from "@/fire-calendar/calendar-reports";
import { downloadCsv } from "@/fire-calendar/calendar-section";
import {
  isMeasured,
  median,
  OUTLIER_MINIMUM,
  peakMonth,
  quantile,
  SEASON_SHARE,
} from "@/fire-calendar/calendar-statistics";
import type { YearValue } from "@/fire-calendar/month-comparison";
import type { AreaCalendar } from "@/fire-calendar/use-area-calendar";
import { inLocale, tr, useLocale, useTr } from "@/i18n/locale";
import type { SymbolName } from "@/icons/material-symbols";
import {
  bandVerdict,
  MonthShareBars,
  RangeGauge,
  RatioList,
  shareLabel,
  VERDICT_TEXT,
  YearBars,
} from "./evidence-charts";
import { EvidenceChip, EvidenceDialog, EvidenceStat } from "./evidence-dialog";

type Evidence = {
  eyebrow: string;
  icon: SymbolName;
  title: string;
  lead: string;
  summary: ReactNode;
  note: string;
  csv: string[];
  showKey: string;
  body: ReactNode;
};

const RECENT_OUTLIERS = 5;

function csvValue(value: number | null): string {
  return value === null ? "" : String(Math.round(value * 100) / 100);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function usualBand(
  history: YearValue[],
  firstYear: number,
  lastYear: number,
): [number, number] | null {
  const baseline = history
    .filter((point) => point.year >= firstYear && point.year <= lastYear)
    .flatMap((point) => (point.value === null ? [] : [point.value]))
    .sort((a, b) => a - b);
  return baseline.length
    ? [quantile(baseline, 0.25), quantile(baseline, 0.75)]
    : null;
}

function DifferenceChip({
  value,
  typical,
}: {
  value: number;
  typical: number;
}) {
  useLocale();
  const { text, direction } = difference(value, typical);
  return (
    <EvidenceChip
      tone={direction === "equal" ? "neutral" : direction}
      icon={
        direction === "above"
          ? "arrow_upward"
          : direction === "below"
            ? "arrow_downward"
            : undefined
      }
    >
      {text}
    </EvidenceChip>
  );
}

function VerdictChip({
  value,
  band,
}: {
  value: number;
  band: [number, number] | null;
}) {
  useLocale();
  const verdict = bandVerdict(value, band);
  if (!verdict) {
    return null;
  }
  return (
    <EvidenceChip
      icon={verdict === "inside" ? "adjust" : "flag"}
      tone={verdict === "inside" ? "neutral" : verdict}
    >
      {VERDICT_TEXT[verdict]}
    </EvidenceChip>
  );
}

function TypicalStat({ typical, years }: { typical: number; years: number }) {
  const t = useTr();
  return (
    <EvidenceStat
      label={t("Typical", "Típico")}
      value={typical}
      format={formatCount}
      unit={hotspotsWord(typical)}
    >
      <p className="type-body-sm text-ink-muted">
        {t(`Median of ${yearsLabel(years)}`, `Mediana de ${yearsLabel(years)}`)}
      </p>
    </EvidenceStat>
  );
}

function seasonEvidence(calendar: AreaCalendar): Evidence | null {
  const { analysis, visibleYears: years, areaName, source } = calendar;
  const season = analysis.season;
  if (!season || analysis.baselines.some((baseline) => baseline === null)) {
    return null;
  }
  const medians = analysis.baselines.map((baseline) => baseline!.median);
  const typicalTotal = sum(medians);
  const compared = [...years]
    .reverse()
    .find((year) =>
      season.months.every(
        (month) => isMeasured(year.cells[month]) && !year.cells[month].partial,
      ),
    );
  const comparedTotal = compared
    ? sum(compared.cells.filter(isMeasured).map((cell) => cell.value!))
    : 0;
  const comparedShare =
    compared && comparedTotal > 0
      ? sum(season.months.map((month) => compared.cells[month].value!)) /
        comparedTotal
      : null;
  const ongoing = compared?.cells.some(
    (cell) => cell.state === "future" || cell.partial,
  );
  const comparedLabel = compared
    ? `${compared.year}${ongoing ? tr(", so far", ", até agora") : ""}`
    : "";
  const comparedShares =
    compared && comparedTotal > 0
      ? compared.cells.map((cell) =>
          isMeasured(cell) && !cell.partial
            ? cell.value! / comparedTotal
            : null,
        )
      : null;
  const points =
    comparedShare === null
      ? null
      : Math.round((comparedShare - season.share) * 100);
  const range = monthRangeLabel(season.months);
  const count = season.months.length;
  const shares = season.months
    .map(
      (month) =>
        `${MONTH_NAMES[month]} ${shareLabel(medians[month] / typicalTotal)}`,
    )
    .join(", ");

  return {
    eyebrow: tr(`Peak season · ${areaName}`, `Temporada crítica · ${areaName}`),
    icon: "event",
    title: tr(
      `${capitalized(range)} holds ${shareLabel(season.share)} of a typical year's hotspots.`,
      `${capitalized(range)} concentra ${shareLabel(season.share)} dos focos de um ano típico.`,
    ),
    lead: tr(
      `${count === 1 ? "A single month" : `${count} months in a row`}: the shortest stretch of the year that holds at least ${shareLabel(SEASON_SHARE)} of a typical year's hotspots.`,
      `${count === 1 ? "É o mês" : `São ${count} meses seguidos`}: o menor trecho do ano que reúne pelo menos ${shareLabel(SEASON_SHARE)} dos focos de um ano típico.`,
    ),
    summary:
      comparedShare !== null && points !== null ? (
        <>
          <EvidenceChip icon="calendar_month">
            {tr(
              `In ${comparedLabel}: ${shareLabel(comparedShare)} of the year's hotspots`,
              `Em ${comparedLabel}: ${shareLabel(comparedShare)} dos focos do ano`,
            )}
          </EvidenceChip>
          <EvidenceChip
            tone={points > 0 ? "above" : points < 0 ? "below" : "neutral"}
            icon={
              points > 0
                ? "arrow_upward"
                : points < 0
                  ? "arrow_downward"
                  : undefined
            }
          >
            {points === 0
              ? tr("same as typical", "igual ao típico")
              : tr(
                  `${Math.abs(points)} pp ${points > 0 ? "above" : "below"} typical`,
                  `${Math.abs(points)} p.p. ${points > 0 ? "acima" : "abaixo"} do típico`,
                )}
          </EvidenceChip>
        </>
      ) : null,
    note: tr(
      `${capitalized(SOURCE_SHORT_UNITS[source])} · median ${baselineLabel(analysis)}`,
      `${capitalized(SOURCE_SHORT_UNITS[source])} · mediana ${baselineLabel(analysis)}`,
    ),
    csv: [
      `mes,mediana,participacao_tipica${compared ? `,focos_${compared.year},participacao_${compared.year}` : ""}`,
      ...medians.map((value, month) => {
        const cell = compared?.cells[month];
        const yearValues =
          compared && cell
            ? `,${isMeasured(cell) ? csvValue(cell.value) : ""},${isMeasured(cell) && comparedTotal > 0 ? (cell.value! / comparedTotal).toFixed(4) : ""}`
            : "";
        return `${month + 1},${csvValue(value)},${(value / typicalTotal).toFixed(4)}${yearValues}`;
      }),
    ],
    showKey: (compared ?? years.at(-1)!).cells[season.months[0]].key,
    body: (
      <>
        <MonthShareBars
          values={medians}
          season={season.months}
          breaks={analysis.breaks}
          compare={
            comparedShares
              ? {
                  label: tr(
                    `${capitalized(comparedLabel)}: share of each month`,
                    `${capitalized(comparedLabel)}: parte de cada mês`,
                  ),
                  shares: comparedShares,
                }
              : null
          }
          label={tr(
            `Each month's share of a typical year's hotspots in ${areaName}. ${capitalized(shares)}, adding up to ${shareLabel(season.share)}.`,
            `Participação de cada mês nos focos de um ano típico em ${areaName}. ${capitalized(shares)}, somando ${shareLabel(season.share)}.`,
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <EvidenceStat
            label={tr("Typical year", "Ano típico")}
            value={season.share * 100}
            format={(value) => shareLabel(value / 100)}
            unit={tr("of the year's hotspots", "dos focos do ano")}
          >
            <p className="type-body-sm text-ink-muted">
              {tr(
                `Median ${baselineLabel(analysis)}`,
                capitalized(`mediana ${baselineLabel(analysis)}`),
              )}
            </p>
          </EvidenceStat>
          {comparedShare !== null && (
            <EvidenceStat
              label={comparedLabel}
              value={comparedShare * 100}
              format={(value) => shareLabel(value / 100)}
              unit={tr("of the year's hotspots", "dos focos do ano")}
            >
              <p className="type-body-sm text-ink-muted">
                {tr(
                  `In the same months: ${range}`,
                  `Nos mesmos meses: ${range}`,
                )}
              </p>
            </EvidenceStat>
          )}
        </div>
      </>
    ),
  };
}

function recordEvidence(calendar: AreaCalendar): Evidence | null {
  const {
    analysis,
    visibleYears: years,
    areaName,
    source,
    enabledMonths,
  } = calendar;
  const record = analysis.record;
  if (!record) {
    return null;
  }
  const complete = years
    .filter((year) => year.year <= analysis.lastBaselineYear)
    .map((year) => {
      const total = analysis.totals.get(year.year);
      return {
        year: year.year,
        value: total?.complete ? total.total : null,
      };
    });
  const totals = complete.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  const typical = median(totals);
  const allMonths = enabledMonths.every(Boolean);
  return {
    eyebrow: tr(`Record year · ${areaName}`, `Ano recorde · ${areaName}`),
    icon: "bar_chart",
    title:
      record.ratio !== null
        ? tr(
            `${record.year} had ${formatRatio(record.ratio)}× the hotspots of a typical year.`,
            `${record.year} teve ${formatRatio(record.ratio)}× os focos de um ano típico.`,
          )
        : tr(
            `${record.year} had ${formatHotspots(record.total)}.`,
            `${record.year} teve ${formatHotspots(record.total)}.`,
          ),
    lead: tr(
      `We add up ${allMonths ? "all 12 months" : `the chosen months (${enabledMonthsLabel(enabledMonths)})`} of each complete year ${baselineLabel(analysis)}. The typical year is the median of these ${yearsLabel(totals.length)}.`,
      `Somamos ${allMonths ? "os 12 meses" : `os meses escolhidos (${enabledMonthsLabel(enabledMonths)})`} de cada ano completo ${baselineLabel(analysis)}. O ano típico é a mediana desses ${yearsLabel(totals.length)}.`,
    ),
    summary: (
      <>
        <EvidenceChip icon="flag">
          {tr(
            `Highest total in ${yearsLabel(totals.length)}`,
            `Maior total em ${yearsLabel(totals.length)}`,
          )}
        </EvidenceChip>
        {typical ? (
          <DifferenceChip value={record.total} typical={typical} />
        ) : null}
      </>
    ),
    note: `${capitalized(SOURCE_SHORT_UNITS[source])} · ${PASSES_DESCRIPTIONS[calendar.passes]}`,
    csv: [
      "ano,focos",
      ...complete.map((point) => `${point.year},${csvValue(point.value)}`),
    ],
    showKey:
      peakMonth(years.find((year) => year.year === record.year))?.key ??
      `${record.year}-01`,
    body: (
      <>
        <YearBars
          points={complete}
          highlight={record.year}
          highlightLabel={tr(
            `${record.year}, the record`,
            `${record.year}, o recorde`,
          )}
          typical={typical}
          band={null}
          label={tr(
            `Hotspots per year in ${areaName}, ${baselineLabel(analysis)}. The record is ${record.year}, with ${formatHotspots(record.total)}${typical !== null ? `; the typical year has ${formatHotspots(typical)}` : ""}.`,
            `Focos por ano em ${areaName}, ${baselineLabel(analysis)}. O recorde é ${record.year}, com ${formatHotspots(record.total)}${typical !== null ? `; o ano típico tem ${formatHotspots(typical)}` : ""}.`,
          )}
          valueLabel={formatCount}
          labelEveryBar={false}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {typical !== null && (
            <EvidenceStat
              label={tr("Typical year", "Ano típico")}
              value={typical}
              format={formatCount}
              unit={hotspotsWord(typical)}
            >
              <p className="type-body-sm text-ink-muted">
                {tr(
                  `Median ${baselineLabel(analysis)}`,
                  capitalized(`mediana ${baselineLabel(analysis)}`),
                )}
              </p>
            </EvidenceStat>
          )}
          <EvidenceStat
            label={String(record.year)}
            value={record.total}
            format={formatCount}
            unit={hotspotsWord(record.total)}
          >
            {!typical && (
              <p className="type-body-sm text-ink-muted">
                {tr(
                  "The typical year has no hotspots.",
                  "O ano típico não tem focos.",
                )}
              </p>
            )}
          </EvidenceStat>
        </div>
      </>
    ),
  };
}

function outlierEvidence(calendar: AreaCalendar): Evidence | null {
  const { analysis, visibleYears: years, areaName, source } = calendar;
  const { outliers } = analysis;
  const latest = outliers.at(-1);
  if (!latest) {
    return null;
  }
  const counts = years.map((year) => ({
    year: year.year,
    value: outliers.filter((cell) => cell.year === year.year).length,
  }));
  const busiest = counts.reduce((best, point) =>
    point.value >= best.value ? point : best,
  );
  const typicalOf = (cell: CalendarCell) =>
    analysis.baselines[cell.month - 1]?.median ?? null;
  const recent = [...outliers]
    .reverse()
    .slice(0, RECENT_OUTLIERS)
    .map((cell) => {
      const typical = typicalOf(cell);
      return {
        key: cell.key,
        label: monthTitle(cell),
        value: cell.value!,
        ratio: typical ? cell.value! / typical : null,
      };
    });
  const criteria = tr(
    [
      "Goes above the 90th percentile of the same month: more hotspots than in 9 out of 10 years",
      "Has at least twice the median of the same month",
      `Has at least ${OUTLIER_MINIMUM} hotspots`,
    ],
    [
      "Passa do percentil 90 do mesmo mês: mais focos que 9 em cada 10 anos",
      "Tem pelo menos o dobro da mediana do mesmo mês",
      `Tem no mínimo ${OUTLIER_MINIMUM} focos`,
    ],
  );
  return {
    eyebrow: tr(`Unusual months · ${areaName}`, `Fora do padrão · ${areaName}`),
    icon: "flag",
    title: tr(
      `${outliers.length} unusual ${outliers.length === 1 ? "month" : "months"} ${sinceLabel(analysis)}.`,
      `${outliers.length} ${outliers.length === 1 ? "mês ficou" : "meses ficaram"} fora do padrão ${sinceLabel(analysis)}.`,
    ),
    lead: tr(
      "A month is unusual when it meets all three conditions, always compared with the same month in the other years:",
      "Um mês fica fora do padrão quando cumpre as três condições, sempre comparado com o mesmo mês dos outros anos:",
    ),
    summary: (
      <>
        <EvidenceChip icon="schedule">
          {tr(
            `Latest: ${monthTitle(latest)}`,
            `Mais recente: ${monthTitle(latest)}`,
          )}
        </EvidenceChip>
        <EvidenceChip icon="bar_chart">
          {tr(
            `Year with the most: ${busiest.year}, ${monthsLabel(busiest.value)}`,
            `Ano com mais: ${busiest.year}, ${busiest.value} ${busiest.value === 1 ? "mês" : "meses"}`,
          )}
        </EvidenceChip>
      </>
    ),
    note: `${capitalized(SOURCE_SHORT_UNITS[source])} · ${PASSES_DESCRIPTIONS[calendar.passes]}`,
    csv: [
      "mes,focos,tipico,razao",
      ...[...outliers].reverse().map((cell) => {
        const typical = typicalOf(cell);
        return `${cell.key},${csvValue(cell.value)},${csvValue(typical)},${typical ? (cell.value! / typical).toFixed(2) : ""}`;
      }),
    ],
    showKey: latest.key,
    body: (
      <>
        <ol className="-mt-2 flex flex-col gap-2">
          {criteria.map((criterion, index) => (
            <li
              key={criterion}
              className="type-body-sm flex items-start gap-2.5 text-ink"
            >
              <span className="type-data inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-tint-alert text-[11px] text-delta-above">
                {index + 1}
              </span>
              {criterion}
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2">
          <p className="type-eyebrow text-ink-muted">
            {tr(
              "Unusual months in each year",
              "Meses fora do padrão em cada ano",
            )}
          </p>
          <YearBars
            points={counts}
            highlight={latest.year}
            highlightLabel={tr(
              `${latest.year}: year of the latest`,
              `${latest.year}: ano do mais recente`,
            )}
            typical={null}
            band={null}
            label={tr(
              `Unusual months per year in ${areaName}, ${sinceLabel(analysis)}. The year with the most was ${busiest.year}, with ${busiest.value}.`,
              `Meses fora do padrão por ano em ${areaName}, ${sinceLabel(analysis)}. O ano com mais foi ${busiest.year}, com ${busiest.value}.`,
            )}
            valueLabel={String}
            labelEveryBar
          />
        </div>
        <div className="flex flex-col gap-3 rounded-md bg-surface-hover px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="type-eyebrow text-ink-muted">
              {recent.length === 1
                ? tr("The case", "O caso")
                : tr(
                    `The ${recent.length} most recent`,
                    `Os ${recent.length} mais recentes`,
                  )}
            </p>
            <p className="type-body-sm flex items-center gap-1.5 text-ink-muted">
              <span aria-hidden="true" className="h-3 w-px bg-ink" />
              {tr(
                "thin line: typical for the month (1×)",
                "linha fina: o típico do mês (1×)",
              )}
            </p>
          </div>
          <RatioList rows={recent} />
        </div>
      </>
    ),
  };
}

function comparisonBody({
  history,
  highlight,
  highlightLabel,
  value,
  typical,
  band,
  baselineYears,
  label,
  chartLabel,
}: {
  history: YearValue[];
  highlight: number;
  highlightLabel: string;
  value: number;
  typical: number;
  band: [number, number] | null;
  baselineYears: number;
  label: string;
  chartLabel: string;
}) {
  return (
    <>
      <YearBars
        points={history}
        highlight={highlight}
        highlightLabel={highlightLabel}
        typical={typical}
        band={band}
        label={chartLabel}
        valueLabel={formatCount}
        labelEveryBar={false}
      />
      <RangeGauge
        history={history}
        highlight={highlight}
        highlightLabel={String(highlight)}
        typical={typical}
        band={band}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TypicalStat typical={typical} years={baselineYears} />
        <EvidenceStat
          label={label}
          value={value}
          format={formatCount}
          unit={hotspotsWord(value)}
        >
          <p className="type-body-sm text-ink-muted">
            {capitalized(difference(value, typical).text)}
          </p>
        </EvidenceStat>
      </div>
    </>
  );
}

function monthEvidence(
  calendar: AreaCalendar,
  kind: "closed-month" | "current-month",
): Evidence | null {
  const { analysis, areaName, source } = calendar;
  const comparison =
    kind === "closed-month" ? calendar.closedMonth : calendar.currentMonth;
  if (!comparison || comparison.value === null || comparison.typical === null) {
    return null;
  }
  const { cell, value, typical, rank, throughDay, history } = comparison;
  const band = usualBand(
    history,
    analysis.firstYear,
    analysis.lastBaselineYear,
  );
  const monthName = MONTH_NAMES[cell.month - 1];
  const days = throughDay
    ? tr(`${monthName} 1-${throughDay}`, `de 1 a ${throughDay} de ${monthName}`)
    : null;
  // CSV column names stay in Portuguese in every language.
  const csvDays = throughDay
    ? inLocale(
        "pt",
        () => `de 1 a ${throughDay} de ${MONTH_NAMES[cell.month - 1]}`,
      )
    : null;
  const name = capitalized(monthTitle(cell));
  return {
    eyebrow: `${
      kind === "closed-month"
        ? tr("Last full month", "Último mês fechado")
        : tr("Current month", "Mês corrente")
    } · ${areaName}`,
    icon: "calendar_month",
    title: tr(
      `${name} had ${formatHotspots(value)}${throughDay ? ` through the ${ordinal(throughDay)}` : ""}, ${difference(value, typical).text}.`,
      `${name} teve ${formatHotspots(value)}${throughDay ? ` de 1 a ${throughDay}` : ""}, ${difference(value, typical).text}.`,
    ),
    lead: tr(
      `We compare it with ${days ? `the same days, ${days},` : `${monthName}`} of each year. Typical is the median ${baselineLabel(analysis)}.`,
      `Comparamos com ${days ? `os mesmos dias, ${days},` : `${monthName}`} de cada ano. O típico é a mediana ${baselineLabel(analysis)}.`,
    ),
    summary: (
      <>
        <DifferenceChip value={value} typical={typical} />
        <VerdictChip value={value} band={band} />
        {rank && rank.of > 1 && (
          <EvidenceChip icon="bar_chart">
            {tr(
              `${ordinal(rank.rank)} busiest ${monthName} in ${yearsLabel(rank.of)}`,
              `${ordinal(rank.rank)} ${monthName} mais ativo em ${yearsLabel(rank.of)}`,
            )}
          </EvidenceChip>
        )}
      </>
    ),
    note: `${capitalized(SOURCE_SHORT_UNITS[source])} · ${PASSES_DESCRIPTIONS[calendar.passes]}`,
    csv: [
      csvDays ? `ano,focos_${csvDays.replaceAll(" ", "_")}` : "ano,focos",
      ...history.map((point) => `${point.year},${csvValue(point.value)}`),
    ],
    showKey: cell.key,
    body: comparisonBody({
      history,
      highlight: cell.year,
      highlightLabel: `${cell.year}${days ? `, ${days}` : ""}`,
      value,
      typical,
      band,
      baselineYears: comparison.baselineYears,
      label: throughDay
        ? tr(
            `${monthName} 1-${throughDay}, ${cell.year}`,
            `1 a ${throughDay} de ${monthTitle(cell)}`,
          )
        : name,
      chartLabel: tr(
        `Hotspots ${days ? `on ${days}` : `in ${monthName}`} of each year in ${areaName}, from ${history[0]?.year} to ${cell.year}. ${cell.year} has ${formatHotspots(value)}; typical is ${formatHotspots(typical)}.`,
        `Focos ${days ? `${days}` : `em ${monthName}`} de cada ano em ${areaName}, de ${history[0]?.year} a ${cell.year}. ${cell.year} tem ${formatHotspots(value)}; o típico é ${formatHotspots(typical)}.`,
      ),
    }),
  };
}

function periodEvidence(
  calendar: AreaCalendar,
  report: PeriodReport | null,
): Evidence | null {
  if (!report) {
    return null;
  }
  const { analysis, areaName, source } = calendar;
  const { comparison, eyebrow, dates, note } = report;
  const { value, typical, rank, history, startYear, end } = comparison;
  if (value === null || typical === null) {
    return null;
  }
  const band = usualBand(
    history,
    analysis.firstYear,
    analysis.lastBaselineYear,
  );
  return {
    eyebrow: `${eyebrow} · ${areaName}`,
    icon: "date_range",
    title: `${dates}: ${formatHotspots(value)}, ${difference(value, typical).text}.`,
    lead: tr(
      `We add up the same days in each year and compare with the median ${baselineLabel(analysis)}.${note ? ` ${note}` : ""}`,
      `Somamos os mesmos dias em cada ano e comparamos com a mediana ${baselineLabel(analysis)}.${note ? ` ${note}` : ""}`,
    ),
    summary: (
      <>
        <DifferenceChip value={value} typical={typical} />
        <VerdictChip value={value} band={band} />
        {rank && rank.of > 1 && (
          <EvidenceChip icon="bar_chart">
            {tr(
              `${ordinal(rank.rank)} busiest for these dates in ${yearsLabel(rank.of)}`,
              `${ordinal(rank.rank)} mais ativo nestas datas em ${yearsLabel(rank.of)}`,
            )}
          </EvidenceChip>
        )}
      </>
    ),
    note: `${capitalized(SOURCE_SHORT_UNITS[source])} · ${PASSES_DESCRIPTIONS[calendar.passes]}`,
    csv: [
      `ano,focos_${comparison.start.slice(5)}_${end.slice(5)}`,
      ...history.map((point) => `${point.year},${csvValue(point.value)}`),
    ],
    showKey: end.slice(0, 7),
    body: comparisonBody({
      history,
      highlight: startYear,
      highlightLabel: dates,
      value,
      typical,
      band,
      baselineYears: comparison.baselineYears,
      label: dates,
      chartLabel: tr(
        `Hotspots on the same dates of each year in ${areaName}, from ${history[0]?.year} to ${history.at(-1)?.year}. ${startYear} has ${formatHotspots(value)}; typical is ${formatHotspots(typical)}.`,
        `Focos nas mesmas datas de cada ano em ${areaName}, de ${history[0]?.year} a ${history.at(-1)?.year}. ${startYear} tem ${formatHotspots(value)}; o típico é ${formatHotspots(typical)}.`,
      ),
    }),
  };
}

function evidenceFor(
  kind: ReportKind,
  calendar: AreaCalendar,
  period: PeriodReport | null,
): Evidence | null {
  switch (kind) {
    case "period":
      return periodEvidence(calendar, period);
    case "season":
      return seasonEvidence(calendar);
    case "record":
      return recordEvidence(calendar);
    case "outliers":
      return outlierEvidence(calendar);
    default:
      return monthEvidence(calendar, kind);
  }
}

export function ReportEvidence({
  kind,
  calendar,
  period,
  onClose,
  onShow,
}: {
  kind: ReportKind;
  calendar: AreaCalendar;
  period: PeriodReport | null;
  onClose: () => void;
  onShow: (key: string) => void;
}) {
  useLocale();
  const evidence = evidenceFor(kind, calendar, period);
  if (!evidence) {
    return null;
  }
  return (
    <EvidenceDialog
      eyebrow={evidence.eyebrow}
      icon={evidence.icon}
      title={evidence.title}
      lead={evidence.lead}
      summary={evidence.summary}
      note={evidence.note}
      onDownload={() =>
        downloadCsv(
          `heru-evidencias-${kind}-${calendar.area}-${calendar.source}-${calendar.passes}.csv`,
          evidence.csv,
        )
      }
      onShow={() => onShow(evidence.showKey)}
      onClose={onClose}
    >
      {evidence.body}
    </EvidenceDialog>
  );
}
