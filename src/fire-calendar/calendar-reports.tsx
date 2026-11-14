import type { ReactNode } from "react";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import {
  computingReason,
  difference,
  formatCount,
  formatDayMonth,
  formatRatio,
  MONTH_NAMES,
  monthRangeLabel,
  monthTitle,
  noDataReason,
  yearsLabel,
} from "./calendar-labels";
import { CALENDAR_FIRST_YEAR, type CalendarSource } from "./calendar-matrix";
import type { CalendarAnalysis } from "./calendar-statistics";
import type { MonthComparison } from "./month-comparison";

function ReportCard({
  eyebrow,
  icon,
  className,
  children,
}: {
  eyebrow: string;
  icon?: SymbolName;
  className: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`flex flex-col gap-3 rounded-md border border-line bg-surface p-6 ${className}`}
    >
      <p className="type-eyebrow flex items-center gap-2 text-ink-muted">
        {icon && <MaterialSymbol name={icon} className="size-[18px]" />}
        {eyebrow}
      </p>
      {children}
    </article>
  );
}

function DeltaBadge({ value, typical }: { value: number; typical: number }) {
  const { text, direction } = difference(value, typical);
  return (
    <span
      className={`type-button inline-flex h-6 items-center gap-1 self-start rounded-sm px-2 tracking-normal normal-case tabular-nums ${direction === "above" ? "bg-tint-alert text-delta-above" : direction === "below" ? "bg-tint-info text-delta-below" : "bg-surface-raised text-ink"}`}
    >
      {direction !== "equal" && (
        <MaterialSymbol
          name={direction === "above" ? "arrow_upward" : "arrow_downward"}
          className="size-4"
        />
      )}
      {text}
    </span>
  );
}

function unavailableText(comparison: MonthComparison, source: CalendarSource) {
  const { cell } = comparison;
  if (cell.state === "computing" || (cell.partial && source === "harmonized")) {
    return computingReason(cell);
  }
  if (cell.state === "loading") {
    return "Carregando o histórico. Este mês chega na próxima atualização.";
  }
  return noDataReason(source, cell);
}

function MonthCard({
  eyebrow,
  comparison,
  source,
  typicalLabel,
}: {
  eyebrow: string;
  comparison: MonthComparison;
  source: CalendarSource;
  typicalLabel: string;
}) {
  const { cell, value, typical, rank, baselineYears, throughDay } = comparison;
  const monthName = MONTH_NAMES[cell.month - 1];
  return (
    <ReportCard eyebrow={eyebrow} className="lg:col-span-3">
      <h3 className="type-heading-md text-ink">
        {monthTitle(cell)}
        {throughDay !== null && (
          <span className="type-body-sm ml-2 text-ink-muted">
            até{" "}
            {formatDayMonth(
              `${cell.key}-${String(throughDay).padStart(2, "0")}`,
            )}
            , último dia completo
          </span>
        )}
      </h3>
      {value === null ? (
        <p className="type-body flex items-start gap-2 text-ink-muted">
          <MaterialSymbol
            name="schedule"
            className="mt-1 size-[18px] shrink-0"
          />
          {unavailableText(comparison, source)}
        </p>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="type-stat-xl text-ink">{formatCount(value)}</span>
            <span className="type-body-sm text-ink-muted">focos</span>
          </p>
          {typical !== null && <DeltaBadge value={value} typical={typical} />}
          <p className="type-body-sm text-ink-muted">
            {typical === null
              ? "Ainda sem referência para este mês."
              : `${typicalLabel}: ${formatCount(typical)} focos, mediana de ${yearsLabel(baselineYears)}.`}
            {rank &&
              rank.of > 1 &&
              ` É o ${rank.rank}º ${monthName} mais ativo em ${yearsLabel(rank.of)}.`}
          </p>
        </>
      )}
    </ReportCard>
  );
}

export function CalendarReports({
  areaName,
  subtitle,
  analysis,
  closedMonth,
  currentMonth,
  source,
}: {
  areaName: string;
  subtitle: string;
  analysis: CalendarAnalysis;
  closedMonth: MonthComparison | null;
  currentMonth: MonthComparison | null;
  source: CalendarSource;
}) {
  const { season, record, outliers } = analysis;
  const latestOutlier = outliers.at(-1);
  const seasonName = season ? monthRangeLabel(season.months) : null;

  return (
    <section aria-labelledby="reports-title" className="mt-12">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="reports-title" className="type-section-title text-ink">
          Relatórios
        </h2>
        <span className="type-body-sm text-ink-muted">
          {areaName} · {subtitle}
        </span>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
        {closedMonth && (
          <MonthCard
            eyebrow="Último mês fechado"
            comparison={closedMonth}
            source={source}
            typicalLabel={`Típico de ${MONTH_NAMES[closedMonth.cell.month - 1]}`}
          />
        )}
        {currentMonth && (
          <MonthCard
            eyebrow="Mês corrente"
            comparison={currentMonth}
            source={source}
            typicalLabel={`Típico de 1 a ${currentMonth.throughDay} de ${MONTH_NAMES[currentMonth.cell.month - 1]}`}
          />
        )}
        <ReportCard
          eyebrow="Temporada crítica"
          icon="event"
          className="lg:col-span-2"
        >
          <h3 className="type-heading-md text-ink first-letter:uppercase">
            {seasonName ?? "Ainda sem referência"}
          </h3>
          <p className="type-body text-ink-muted">
            {season
              ? `Concentra ${Math.round(season.share * 100)}% dos focos de um ano típico.`
              : "Falta a mediana de algum mês para achar a temporada."}
          </p>
        </ReportCard>
        <ReportCard
          eyebrow="Ano recorde"
          icon="bar_chart"
          className="lg:col-span-2"
        >
          <h3 className="type-heading-md text-ink">
            {record ? record.year : "Ainda sem anos completos"}
          </h3>
          <p className="type-body text-ink-muted">
            {record
              ? `Teve ${formatRatio(record.ratio)}× os focos da mediana dos anos desde ${CALENDAR_FIRST_YEAR}.`
              : `Nenhum ano desde ${CALENDAR_FIRST_YEAR} tem todos os meses escolhidos com dado.`}
          </p>
        </ReportCard>
        <ReportCard
          eyebrow="Fora do padrão"
          icon="flag"
          className="lg:col-span-2"
        >
          <h3 className="type-heading-md text-ink">
            {outliers.length === 0
              ? "Nenhum mês"
              : `${outliers.length} ${outliers.length === 1 ? "mês" : "meses"}`}
          </h3>
          <p className="type-body text-ink-muted">
            Desde {CALENDAR_FIRST_YEAR}.
            {latestOutlier &&
              ` O mais recente foi ${monthTitle(latestOutlier)}.`}
          </p>
        </ReportCard>
      </div>
    </section>
  );
}
