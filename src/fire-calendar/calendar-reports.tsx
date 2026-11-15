import type { ReactNode } from "react";
import { buttonClassName } from "@/button/button-class-name";
import { tr, useLocale, useTr } from "@/i18n/locale";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import {
  capitalized,
  computingReason,
  type Difference,
  difference,
  formatCount,
  formatDayMonth,
  formatHotspots,
  hotspotsWord,
  MONTH_NAMES,
  monthsLabel,
  monthTitle,
  noDataReason,
  ordinal,
  recordSummary,
  seasonSummary,
  sinceLabel,
  yearsLabel,
} from "./calendar-labels";
import type { CalendarSource } from "./calendar-matrix";
import type { CalendarAnalysis } from "./calendar-statistics";
import type { MonthComparison, PeriodComparison } from "./month-comparison";

export type PeriodReport = {
  comparison: PeriodComparison;
  eyebrow: string;
  title: string;
  dates: string;
  note: string | null;
};

export type ReportKind =
  | "period"
  | "closed-month"
  | "current-month"
  | "season"
  | "record"
  | "outliers";

function EvidenceLink({ onClick }: { onClick: () => void }) {
  const t = useTr();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${buttonClassName({ variant: "secondary", size: "sm" })} mt-auto self-start`}
    >
      {t("See evidence", "Ver evidências")}
      <MaterialSymbol name="arrow_forward" className="size-[18px]" />
    </button>
  );
}

export function ReportCard({
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

export function DeltaBadge({
  value,
  typical,
}: {
  value: number;
  typical: number;
}) {
  useLocale();
  return <TrendBadge {...difference(value, typical)} />;
}

export function TrendBadge({ text, direction }: Difference) {
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

export function unavailableText(
  comparison: MonthComparison,
  source: CalendarSource,
) {
  const { cell } = comparison;
  if (cell.state === "computing" || (cell.partial && source === "harmonized")) {
    return computingReason(cell);
  }
  if (cell.state === "loading") {
    return tr(
      "Loading the history. This month arrives in the next update.",
      "Carregando o histórico. Este mês chega na próxima atualização.",
    );
  }
  return noDataReason(source, cell);
}

export function PeriodCard({
  report,
  onEvidence,
}: {
  report: PeriodReport;
  onEvidence: (() => void) | null;
}) {
  const t = useTr();
  const { comparison, eyebrow, title, note } = report;
  const { value, typical, rank, baselineYears } = comparison;
  return (
    <ReportCard eyebrow={eyebrow} icon="date_range" className="lg:col-span-2">
      <h3 className="type-heading-md text-ink">{title}</h3>
      {value === null ? (
        <p className="type-body flex items-start gap-2 text-ink-muted">
          <MaterialSymbol
            name="schedule"
            className="mt-1 size-[18px] shrink-0"
          />
          {t(
            "Some days in this period still lack data.",
            "Ainda faltam dados de algum dia deste período.",
          )}
        </p>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="type-stat-xl text-ink">{formatCount(value)}</span>
            <span className="type-body-sm text-ink-muted">
              {hotspotsWord(value)}
            </span>
          </p>
          {typical !== null && <DeltaBadge value={value} typical={typical} />}
          <p className="type-body-sm text-ink-muted">
            {typical === null
              ? t(
                  "No baseline for these dates yet.",
                  "Ainda sem referência para estas datas.",
                )
              : t(
                  `Typical for the same dates: ${formatHotspots(typical)}, median of ${yearsLabel(baselineYears)}.`,
                  `Típico para as mesmas datas: ${formatHotspots(typical)}, mediana de ${yearsLabel(baselineYears)}.`,
                )}
            {rank &&
              rank.of > 1 &&
              t(
                ` It is the ${ordinal(rank.rank)} busiest for these dates in ${yearsLabel(rank.of)}.`,
                ` É o ${ordinal(rank.rank)} mais ativo nestas datas em ${yearsLabel(rank.of)}.`,
              )}
          </p>
          {note && <p className="type-caption text-ink-muted">{note}</p>}
          {typical !== null && onEvidence && (
            <EvidenceLink onClick={onEvidence} />
          )}
        </>
      )}
    </ReportCard>
  );
}

function MonthCard({
  eyebrow,
  comparison,
  source,
  typicalLabel,
  onEvidence,
}: {
  eyebrow: string;
  comparison: MonthComparison;
  source: CalendarSource;
  typicalLabel: string;
  onEvidence: (() => void) | null;
}) {
  const t = useTr();
  const { cell, value, typical, rank, baselineYears, throughDay } = comparison;
  const monthName = MONTH_NAMES[cell.month - 1];
  return (
    <ReportCard eyebrow={eyebrow} className="lg:col-span-2">
      <h3 className="type-heading-md text-ink">
        {monthTitle(cell)}
        {throughDay !== null && (
          <span className="type-body-sm ml-2 text-ink-muted">
            {t(
              `through ${formatDayMonth(`${cell.key}-${String(throughDay).padStart(2, "0")}`)}, last complete day`,
              `até ${formatDayMonth(`${cell.key}-${String(throughDay).padStart(2, "0")}`)}, último dia completo`,
            )}
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
            <span className="type-body-sm text-ink-muted">
              {hotspotsWord(value)}
            </span>
          </p>
          {typical !== null && <DeltaBadge value={value} typical={typical} />}
          <p className="type-body-sm text-ink-muted">
            {typical === null
              ? t(
                  "No baseline for this month yet.",
                  "Ainda sem referência para este mês.",
                )
              : t(
                  `${typicalLabel}: ${formatHotspots(typical)}, median of ${yearsLabel(baselineYears)}.`,
                  `${typicalLabel}: ${formatHotspots(typical)}, mediana de ${yearsLabel(baselineYears)}.`,
                )}
            {rank &&
              rank.of > 1 &&
              t(
                ` It is the ${ordinal(rank.rank)} busiest ${monthName} in ${yearsLabel(rank.of)}.`,
                ` É o ${ordinal(rank.rank)} ${monthName} mais ativo em ${yearsLabel(rank.of)}.`,
              )}
          </p>
          {typical !== null && onEvidence && (
            <EvidenceLink onClick={onEvidence} />
          )}
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
  period,
  onEvidence,
}: {
  areaName: string;
  subtitle: string;
  analysis: CalendarAnalysis;
  closedMonth: MonthComparison | null;
  currentMonth: MonthComparison | null;
  source: CalendarSource;
  period: PeriodReport | null;
  onEvidence: ((kind: ReportKind) => void) | null;
}) {
  const t = useTr();
  const { outliers } = analysis;
  const latestOutlier = outliers.at(-1);
  const season = seasonSummary(analysis);
  const record = recordSummary(analysis);

  return (
    <section aria-labelledby="reports-title" className="mt-12">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="reports-title" className="type-section-title text-ink">
          {t("Reports", "Relatórios")}
        </h2>
        <span className="type-body-sm text-ink-muted">
          {areaName} · {subtitle}
        </span>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
        {period && (
          <PeriodCard
            report={period}
            onEvidence={onEvidence && (() => onEvidence("period"))}
          />
        )}
        {closedMonth && (
          <MonthCard
            eyebrow={t("Last full month", "Último mês fechado")}
            comparison={closedMonth}
            source={source}
            typicalLabel={t(
              `Typical for ${MONTH_NAMES[closedMonth.cell.month - 1]}`,
              `Típico de ${MONTH_NAMES[closedMonth.cell.month - 1]}`,
            )}
            onEvidence={onEvidence && (() => onEvidence("closed-month"))}
          />
        )}
        {currentMonth && (
          <MonthCard
            eyebrow={t("Current month", "Mês corrente")}
            comparison={currentMonth}
            source={source}
            typicalLabel={t(
              `Typical for ${MONTH_NAMES[currentMonth.cell.month - 1]} 1-${currentMonth.throughDay}`,
              `Típico de 1 a ${currentMonth.throughDay} de ${MONTH_NAMES[currentMonth.cell.month - 1]}`,
            )}
            onEvidence={onEvidence && (() => onEvidence("current-month"))}
          />
        )}
        <ReportCard
          eyebrow={t("Peak season", "Temporada crítica")}
          icon="event"
          className="lg:col-span-2"
        >
          <h3 className="type-heading-md text-ink first-letter:uppercase">
            {season.title}
          </h3>
          <p className="type-body text-ink-muted">{season.text}</p>
          {analysis.season && onEvidence && (
            <EvidenceLink onClick={() => onEvidence("season")} />
          )}
        </ReportCard>
        <ReportCard
          eyebrow={t("Record year", "Ano recorde")}
          icon="bar_chart"
          className="lg:col-span-2"
        >
          <h3 className="type-heading-md text-ink">{record.title}</h3>
          <p className="type-body text-ink-muted">{record.text}</p>
          {analysis.record && onEvidence && (
            <EvidenceLink onClick={() => onEvidence("record")} />
          )}
        </ReportCard>
        <ReportCard
          eyebrow={t("Unusual months", "Fora do padrão")}
          icon="flag"
          className="lg:col-span-2"
        >
          <h3 className="type-heading-md text-ink">
            {outliers.length === 0
              ? t("No months", "Nenhum mês")
              : monthsLabel(outliers.length)}
          </h3>
          <p className="type-body text-ink-muted">
            {capitalized(sinceLabel(analysis))}.
            {latestOutlier &&
              t(
                ` The latest was ${monthTitle(latestOutlier)}.`,
                ` O mais recente foi ${monthTitle(latestOutlier)}.`,
              )}
          </p>
          {latestOutlier && onEvidence && (
            <EvidenceLink onClick={() => onEvidence("outliers")} />
          )}
        </ReportCard>
      </div>
    </section>
  );
}
