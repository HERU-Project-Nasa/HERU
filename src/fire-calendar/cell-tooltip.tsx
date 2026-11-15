import type { ReactNode } from "react";
import { useTr } from "@/i18n/locale";
import { MaterialSymbol } from "@/icons/material-symbols";
import {
  computingReason,
  difference,
  formatCount,
  formatDayMonth,
  monthTitle,
  noDataReason,
  ORIGIN_LABELS,
  rankLabel,
  SOURCE_SHORT_UNITS,
} from "./calendar-labels";
import type { CalendarCell, CalendarSource } from "./calendar-matrix";
import type { CalendarAnalysis, MonthRank } from "./calendar-statistics";

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="type-body-sm text-ink-muted">{term}</dt>
      <dd className="type-body-sm text-right text-ink tabular-nums">
        {children}
      </dd>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="type-caption inline-flex h-6 items-center gap-1 rounded-sm bg-surface px-2 text-ink">
      {children}
    </span>
  );
}

export function CellTooltip({
  id,
  cell,
  analysis,
  rank,
  outlier,
  source,
  lastDataDate,
}: {
  id: string;
  cell: CalendarCell;
  analysis: CalendarAnalysis;
  rank: MonthRank | null;
  outlier: boolean;
  source: CalendarSource;
  lastDataDate: string;
}) {
  const t = useTr();
  const baseline = analysis.baselines[cell.month - 1];
  const measured = cell.state === "value" || cell.state === "zero";
  const typical = baseline ? (
    <Detail term={t("Typical for the month", "Típico do mês")}>
      {formatCount(baseline.median)}
      {baseline.years < analysis.baselineYearCount && (
        <span className="block text-ink-muted">
          {t(
            `baseline loading (${baseline.years} of ${analysis.baselineYearCount} years)`,
            `referência carregando (${baseline.years} de ${analysis.baselineYearCount} anos)`,
          )}
        </span>
      )}
    </Detail>
  ) : (
    <Detail term={t("Typical for the month", "Típico do mês")}>
      {t("no baseline yet", "ainda sem referência")}
    </Detail>
  );

  return (
    <div
      id={id}
      role="tooltip"
      className="w-66 max-w-[calc(100vw-2rem)] rounded-sm bg-surface-raised p-3 shadow-overlay"
    >
      <p className="type-caption mb-1 text-ink">{monthTitle(cell)}</p>
      {measured ? (
        <>
          <p className="mb-2.5 flex items-baseline gap-1.5">
            <span className="font-text text-[28px] leading-8 font-semibold tabular-nums">
              {formatCount(cell.value!)}
            </span>
            <span className="type-body-sm text-ink-muted">
              {SOURCE_SHORT_UNITS[source]}
            </span>
          </p>
          <dl className="flex flex-col gap-1">
            {typical}
            {baseline && cell.state === "value" && (
              <Detail term={t("Difference", "Diferença")}>
                {difference(cell.value!, baseline.median).text}
              </Detail>
            )}
            {rank && rankLabel(rank, cell.month) && (
              <Detail term={t("Rank", "Posição")}>
                {rankLabel(rank, cell.month)}
              </Detail>
            )}
            {cell.origin && (
              <Detail term={t("Origin", "Origem")}>
                {ORIGIN_LABELS[cell.origin]}
              </Detail>
            )}
          </dl>
        </>
      ) : (
        <p className="type-body-sm flex items-start gap-2 text-ink">
          {cell.state === "computing" && (
            <MaterialSymbol
              name="schedule"
              className="mt-0.5 size-4 shrink-0 text-ink-muted"
            />
          )}
          {cell.state === "computing"
            ? computingReason(cell)
            : cell.state === "loading"
              ? t(
                  "Loading the history. This month arrives in the next update.",
                  "Carregando o histórico. Este mês chega na próxima atualização.",
                )
              : noDataReason(source, cell)}
        </p>
      )}
      {(outlier || cell.partial || cell.provisional) && (
        <p className="mt-2.5 flex flex-wrap gap-1.5">
          {outlier && (
            <Badge>
              <MaterialSymbol name="flag" className="size-3.5 text-alert" />
              {t("Unusual", "Fora do padrão")}
            </Badge>
          )}
          {cell.partial && (
            <Badge>
              {t(
                `Partial, through ${formatDayMonth(lastDataDate)}`,
                `Parcial, até ${formatDayMonth(lastDataDate)}`,
              )}
            </Badge>
          )}
          {cell.provisional && <Badge>{t("Preliminary", "Preliminar")}</Badge>}
        </p>
      )}
    </div>
  );
}
