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
  MONTH_NAMES,
  monthRangeLabel,
  monthTitle,
  PASSES_DESCRIPTIONS,
  sinceLabel,
  SOURCE_SHORT_UNITS,
  yearsLabel,
} from "@/fire-calendar/calendar-labels";
import type { CalendarCell } from "@/fire-calendar/calendar-matrix";
import {
  DeltaBadge,
  type PeriodReport,
  type ReportKind,
  TrendBadge,
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
import type { AreaCalendar } from "@/fire-calendar/use-area-calendar";
import type { SymbolName } from "@/icons/material-symbols";
import { MonthShareBars, shareLabel, YearBars } from "./evidence-charts";
import { EvidenceDialog, EvidenceStat } from "./evidence-dialog";

type Evidence = {
  eyebrow: string;
  icon: SymbolName;
  title: string;
  lead: string;
  note: string;
  csv: string[];
  showKey: string;
  body: ReactNode;
};

function csvValue(value: number | null): string {
  return value === null ? "" : String(Math.round(value * 100) / 100);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
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
    ? `${compared.year}${ongoing ? ", até agora" : ""}`
    : "";
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
    eyebrow: `Temporada crítica · ${areaName}`,
    icon: "event",
    title: `${capitalized(range)} concentra ${shareLabel(season.share)} dos focos de um ano típico.`,
    lead: `${count === 1 ? "É o mês" : `São ${count} meses seguidos`}: o menor trecho do ano que reúne pelo menos ${shareLabel(SEASON_SHARE)} dos focos de um ano típico.${comparedShare !== null ? ` Em ${comparedLabel}, esses meses tiveram ${shareLabel(comparedShare)} dos focos do ano.` : ""}`,
    note: `${capitalized(SOURCE_SHORT_UNITS[source])} · mediana ${baselineLabel(analysis)}`,
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
          label={`Participação de cada mês nos focos de um ano típico em ${areaName}. ${capitalized(shares)}, somando ${shareLabel(season.share)}.`}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <EvidenceStat
            label="Ano típico"
            value={shareLabel(season.share)}
            unit="dos focos do ano"
          >
            <p className="type-body-sm text-ink-muted">
              {capitalized(`mediana ${baselineLabel(analysis)}`)}
            </p>
          </EvidenceStat>
          {comparedShare !== null && points !== null && (
            <EvidenceStat
              label={comparedLabel}
              value={shareLabel(comparedShare)}
              unit="dos focos do ano"
            >
              <TrendBadge
                text={
                  points === 0
                    ? "igual ao típico"
                    : `${Math.abs(points)} p.p. ${points > 0 ? "acima" : "abaixo"} do típico`
                }
                direction={
                  points > 0 ? "above" : points < 0 ? "below" : "equal"
                }
              />
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
    eyebrow: `Ano recorde · ${areaName}`,
    icon: "bar_chart",
    title:
      record.ratio !== null
        ? `${record.year} teve ${formatRatio(record.ratio)}× os focos de um ano típico.`
        : `${record.year} teve ${formatHotspots(record.total)}.`,
    lead: `Somamos ${allMonths ? "os 12 meses" : `os meses escolhidos (${enabledMonthsLabel(enabledMonths)})`} de cada ano completo ${baselineLabel(analysis)}. O ano típico é a mediana desses ${yearsLabel(totals.length)}.`,
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
          typical={typical}
          band={null}
          label={`Focos por ano em ${areaName}, ${baselineLabel(analysis)}. O recorde é ${record.year}, com ${formatHotspots(record.total)}${typical !== null ? `; o ano típico tem ${formatHotspots(typical)}` : ""}.`}
          valueLabel={formatCount}
          labelEveryBar={false}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {typical !== null && (
            <EvidenceStat
              label="Ano típico"
              value={formatCount(typical)}
              unit={typical === 1 ? "foco" : "focos"}
            >
              <p className="type-body-sm text-ink-muted">
                {capitalized(`mediana ${baselineLabel(analysis)}`)}
              </p>
            </EvidenceStat>
          )}
          <EvidenceStat
            label={String(record.year)}
            value={formatCount(record.total)}
            unit={record.total === 1 ? "foco" : "focos"}
          >
            {typical ? (
              <DeltaBadge value={record.total} typical={typical} />
            ) : (
              <p className="type-body-sm text-ink-muted">
                O ano típico não tem focos.
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
  const latestTypical = typicalOf(latest);
  return {
    eyebrow: `Fora do padrão · ${areaName}`,
    icon: "flag",
    title: `${outliers.length} ${outliers.length === 1 ? "mês ficou" : "meses ficaram"} fora do padrão ${sinceLabel(analysis)}.`,
    lead: `Um mês fica fora do padrão quando passa do percentil 90 do mesmo mês, tem pelo menos o dobro da mediana e no mínimo ${OUTLIER_MINIMUM} focos. As barras contam esses meses em cada ano.`,
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
        <YearBars
          points={counts}
          highlight={latest.year}
          typical={null}
          band={null}
          label={`Meses fora do padrão por ano em ${areaName}, ${sinceLabel(analysis)}. O ano com mais foi ${busiest.year}, com ${busiest.value}.`}
          valueLabel={String}
          labelEveryBar
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <EvidenceStat
            label={`Mais recente: ${monthTitle(latest)}`}
            value={formatCount(latest.value!)}
            unit="focos"
          >
            {latestTypical !== null && (
              <DeltaBadge value={latest.value!} typical={latestTypical} />
            )}
          </EvidenceStat>
          <EvidenceStat
            label="Ano com mais meses"
            value={String(busiest.year)}
            unit={`${busiest.value} ${busiest.value === 1 ? "mês" : "meses"}`}
          >
            <p className="type-body-sm text-ink-muted">
              {capitalized(sinceLabel(analysis))}
            </p>
          </EvidenceStat>
        </div>
      </>
    ),
  };
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
  const baseline = history
    .filter(
      (point) =>
        point.year >= analysis.firstYear &&
        point.year <= analysis.lastBaselineYear,
    )
    .flatMap((point) => (point.value === null ? [] : [point.value]))
    .sort((a, b) => a - b);
  const band: [number, number] | null = baseline.length
    ? [quantile(baseline, 0.25), quantile(baseline, 0.75)]
    : null;
  const monthName = MONTH_NAMES[cell.month - 1];
  const days = throughDay ? `de 1 a ${throughDay} de ${monthName}` : null;
  const name = capitalized(monthTitle(cell));
  return {
    eyebrow: `${kind === "closed-month" ? "Último mês fechado" : "Mês corrente"} · ${areaName}`,
    icon: "calendar_month",
    title: `${name} teve ${formatHotspots(value)}${throughDay ? ` de 1 a ${throughDay}` : ""}, ${difference(value, typical).text}.`,
    lead: `O típico é a mediana ${days ? `dos mesmos dias, ${days},` : "do mesmo mês"} ${baselineLabel(analysis)}.${band ? ` A faixa usual, entre 25% e 75% dos anos, vai de ${formatCount(band[0])} a ${formatCount(band[1])} focos.` : ""}${rank && rank.of > 1 ? ` É o ${rank.rank}º ${monthName} mais ativo em ${yearsLabel(rank.of)}.` : ""}`,
    note: `${capitalized(SOURCE_SHORT_UNITS[source])} · ${PASSES_DESCRIPTIONS[calendar.passes]}`,
    csv: [
      days ? `ano,focos_${days.replaceAll(" ", "_")}` : "ano,focos",
      ...history.map((point) => `${point.year},${csvValue(point.value)}`),
    ],
    showKey: cell.key,
    body: (
      <>
        <YearBars
          points={history}
          highlight={cell.year}
          typical={typical}
          band={band}
          label={`Focos ${days ? `${days}` : `em ${monthName}`} de cada ano em ${areaName}, de ${history[0]?.year} a ${cell.year}. ${cell.year} tem ${formatHotspots(value)}; o típico é ${formatHotspots(typical)}.`}
          valueLabel={formatCount}
          labelEveryBar={false}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <EvidenceStat
            label="Típico"
            value={formatCount(typical)}
            unit={Math.round(typical) === 1 ? "foco" : "focos"}
          >
            <p className="type-body-sm text-ink-muted">
              Mediana de {yearsLabel(comparison.baselineYears)}
            </p>
          </EvidenceStat>
          <EvidenceStat
            label={
              throughDay ? `1 a ${throughDay} de ${monthTitle(cell)}` : name
            }
            value={formatCount(value)}
            unit={Math.round(value) === 1 ? "foco" : "focos"}
          >
            <DeltaBadge value={value} typical={typical} />
          </EvidenceStat>
        </div>
      </>
    ),
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
  const baseline = history
    .filter(
      (point) =>
        point.year >= analysis.firstYear &&
        point.year <= analysis.lastBaselineYear,
    )
    .flatMap((point) => (point.value === null ? [] : [point.value]))
    .sort((a, b) => a - b);
  const band: [number, number] | null = baseline.length
    ? [quantile(baseline, 0.25), quantile(baseline, 0.75)]
    : null;
  return {
    eyebrow: `${eyebrow} · ${areaName}`,
    icon: "date_range",
    title: `${dates}: ${formatHotspots(value)}, ${difference(value, typical).text}.`,
    lead: `Somamos os mesmos dias em cada ano e comparamos com a mediana ${baselineLabel(analysis)}.${band ? ` A faixa usual, entre 25% e 75% dos anos, vai de ${formatCount(band[0])} a ${formatCount(band[1])} focos.` : ""}${rank && rank.of > 1 ? ` É o ${rank.rank}º mais ativo nestas datas em ${yearsLabel(rank.of)}.` : ""}${note ? ` ${note}` : ""}`,
    note: `${capitalized(SOURCE_SHORT_UNITS[source])} · ${PASSES_DESCRIPTIONS[calendar.passes]}`,
    csv: [
      `ano,focos_${comparison.start.slice(5)}_${end.slice(5)}`,
      ...history.map((point) => `${point.year},${csvValue(point.value)}`),
    ],
    showKey: end.slice(0, 7),
    body: (
      <>
        <YearBars
          points={history}
          highlight={startYear}
          typical={typical}
          band={band}
          label={`Focos nas mesmas datas de cada ano em ${areaName}, de ${history[0]?.year} a ${history.at(-1)?.year}. ${startYear} tem ${formatHotspots(value)}; o típico é ${formatHotspots(typical)}.`}
          valueLabel={formatCount}
          labelEveryBar={false}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <EvidenceStat
            label="Típico"
            value={formatCount(typical)}
            unit={Math.round(typical) === 1 ? "foco" : "focos"}
          >
            <p className="type-body-sm text-ink-muted">
              Mediana de {yearsLabel(comparison.baselineYears)}
            </p>
          </EvidenceStat>
          <EvidenceStat
            label={dates}
            value={formatCount(value)}
            unit={Math.round(value) === 1 ? "foco" : "focos"}
          >
            <DeltaBadge value={value} typical={typical} />
          </EvidenceStat>
        </div>
      </>
    ),
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
