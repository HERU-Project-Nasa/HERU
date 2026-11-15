import type { ReactNode } from "react";
import { buttonClassName } from "@/button/button-class-name";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import {
  capitalized,
  computingReason,
  type Difference,
  difference,
  formatCount,
  formatDayMonth,
  formatHotspots,
  MONTH_NAMES,
  monthTitle,
  noDataReason,
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${buttonClassName({ variant: "secondary", size: "sm" })} mt-auto self-start`}
    >
      Ver evidências
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
    return "Carregando o histórico. Este mês chega na próxima atualização.";
  }
  return noDataReason(source, cell);
}

<<<<<<< HEAD
<<<<<<< HEAD
export function PeriodCard({
=======
function PeriodCard({
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
=======
export function PeriodCard({
>>>>>>> 64dcc6316b354790f1c2374c891c435a06dbd88e
  report,
  onEvidence,
}: {
  report: PeriodReport;
  onEvidence: (() => void) | null;
}) {
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
          Ainda faltam dados de algum dia deste período.
        </p>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="type-stat-xl text-ink">{formatCount(value)}</span>
            <span className="type-body-sm text-ink-muted">
              {Math.round(value) === 1 ? "foco" : "focos"}
            </span>
          </p>
          {typical !== null && <DeltaBadge value={value} typical={typical} />}
          <p className="type-body-sm text-ink-muted">
            {typical === null
              ? "Ainda sem referência para estas datas."
              : `Típico para as mesmas datas: ${formatHotspots(typical)}, mediana de ${yearsLabel(baselineYears)}.`}
            {rank &&
              rank.of > 1 &&
              ` É o ${rank.rank}º mais ativo nestas datas em ${yearsLabel(rank.of)}.`}
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
  const { cell, value, typical, rank, baselineYears, throughDay } = comparison;
  const monthName = MONTH_NAMES[cell.month - 1];
  return (
    <ReportCard eyebrow={eyebrow} className="lg:col-span-2">
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
            <span className="type-body-sm text-ink-muted">
              {Math.round(value) === 1 ? "foco" : "focos"}
            </span>
          </p>
          {typical !== null && <DeltaBadge value={value} typical={typical} />}
          <p className="type-body-sm text-ink-muted">
            {typical === null
              ? "Ainda sem referência para este mês."
              : `${typicalLabel}: ${formatHotspots(typical)}, mediana de ${yearsLabel(baselineYears)}.`}
            {rank &&
              rank.of > 1 &&
              ` É o ${rank.rank}º ${monthName} mais ativo em ${yearsLabel(rank.of)}.`}
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
  const { outliers } = analysis;
  const latestOutlier = outliers.at(-1);
  const season = seasonSummary(analysis);
  const record = recordSummary(analysis);

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
        {period && (
          <PeriodCard
            report={period}
            onEvidence={onEvidence && (() => onEvidence("period"))}
          />
        )}
        {closedMonth && (
          <MonthCard
            eyebrow="Último mês fechado"
            comparison={closedMonth}
            source={source}
            typicalLabel={`Típico de ${MONTH_NAMES[closedMonth.cell.month - 1]}`}
            onEvidence={onEvidence && (() => onEvidence("closed-month"))}
          />
        )}
        {currentMonth && (
          <MonthCard
            eyebrow="Mês corrente"
            comparison={currentMonth}
            source={source}
            typicalLabel={`Típico de 1 a ${currentMonth.throughDay} de ${MONTH_NAMES[currentMonth.cell.month - 1]}`}
            onEvidence={onEvidence && (() => onEvidence("current-month"))}
          />
        )}
        <ReportCard
          eyebrow="Temporada crítica"
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
          eyebrow="Ano recorde"
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
            {capitalized(sinceLabel(analysis))}.
            {latestOutlier &&
              ` O mais recente foi ${monthTitle(latestOutlier)}.`}
          </p>
          {latestOutlier && onEvidence && (
            <EvidenceLink onClick={() => onEvidence("outliers")} />
          )}
        </ReportCard>
      </div>
    </section>
  );
}
