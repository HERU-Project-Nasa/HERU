"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buttonClassName } from "@/button/button-class-name";
import {
  anomaliesHref,
  rememberSelection,
  useCalendarSelection,
} from "@/calendar-selection/calendar-selection";
import {
  baselineLabel,
  capitalized,
  formatCount,
  formatDayMonth,
  formatHotspots,
  hotspotsWord,
  MONTH_NAMES,
  monthsLabel,
  monthTitle,
  ordinal,
  ORIGIN_LABELS,
  rankLabel,
  recordSummary,
  SOURCE_SHORT_UNITS,
  seasonSummary,
  sinceLabel,
  difference,
  yearsLabel,
} from "@/fire-calendar/calendar-labels";
import type { CalendarCell } from "@/fire-calendar/calendar-matrix";
import {
  DeltaBadge,
  PeriodCard,
  ReportCard,
  unavailableText,
} from "@/fire-calendar/calendar-reports";
import {
  CalendarSection,
  DataFootnote,
  downloadCsv,
} from "@/fire-calendar/calendar-section";
import {
  type MonthBaseline,
  monthRank,
  peakMonth,
} from "@/fire-calendar/calendar-statistics";
import {
  type MonthComparison,
  monthComparisonFor,
} from "@/fire-calendar/month-comparison";
import {
  type AreaCalendar,
  useAreaCalendar,
} from "@/fire-calendar/use-area-calendar";
import {
  anchoredPeriod,
  periodFromSearch,
  presetPeriod,
} from "@/fire-map/map-period";
import { periodReport } from "@/fire-map/period-report";
import { useTr } from "@/i18n/locale";
import { MaterialSymbol } from "@/icons/material-symbols";
import { ReportEvidence } from "@/report-evidence/report-evidence";

function CalendarLink({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${buttonClassName({ variant: "secondary", size: "sm" })} self-start`}
    >
      {label}
      <MaterialSymbol name="arrow_forward" className="size-[18px]" />
    </button>
  );
}

function TypicalRange({
  value,
  baseline,
}: {
  value: number;
  baseline: MonthBaseline;
}) {
  const t = useTr();
  const top = Math.max(value, baseline.p90, 1) * 1.15;
  const at = (amount: number) => `${(amount / top) * 100}%`;
  return (
    <figure
      role="img"
      aria-label={t(
        `${formatHotspots(value)}. Typical ${formatCount(baseline.median)}. Usual range ${formatCount(baseline.p25)} to ${formatCount(baseline.p75)}.`,
        `${formatCount(value)} focos. Típico ${formatCount(baseline.median)}. Faixa usual de ${formatCount(baseline.p25)} a ${formatCount(baseline.p75)}.`,
      )}
      className="m-0"
    >
      <div className="relative h-6">
        <span className="absolute inset-x-0 top-2.5 h-1 rounded-xs bg-heat-0 shadow-[inset_0_0_0_1px_var(--color-line)]" />
        <span
          className="absolute top-1.5 h-3 rounded-xs bg-ink-muted/30"
          style={{
            left: at(baseline.p25),
            width: `calc(${at(baseline.p75)} - ${at(baseline.p25)})`,
          }}
        />
        <span
          className="absolute top-0.5 -ml-px h-5 w-0.5 bg-ink-muted"
          style={{ left: at(baseline.median) }}
        />
        <span
          className="absolute top-1 -ml-2 size-4 rounded-full border-[3px] border-surface-ground bg-ink"
          style={{ left: at(value) }}
        />
      </div>
      <div className="relative mt-2 h-8 text-xs leading-4 tabular-nums">
        <span
          className="absolute -translate-x-1/2 text-center whitespace-nowrap text-ink-muted"
          style={{ left: at(baseline.median) }}
        >
          {t("typical", "típico")}
          <br />
          {formatCount(baseline.median)}
        </span>
        <span
          className="absolute -translate-x-1/2 text-center font-semibold whitespace-nowrap text-ink"
          style={{ left: at(value) }}
        >
          {t("this month", "este mês")}
          <br />
          {formatCount(value)}
        </span>
      </div>
    </figure>
  );
}

function MonthOverview({
  calendar,
  focus,
  focusLabel,
  showCurrent,
  onShow,
}: {
  calendar: AreaCalendar;
  focus: MonthComparison | null;
  focusLabel: string;
  showCurrent: boolean;
  onShow: (key: string) => void;
}) {
  const t = useTr();
  const { analysis, source } = calendar;
  const closedMonth = focus;
  const currentMonth = showCurrent ? calendar.currentMonth : null;
  const baseline = closedMonth
    ? analysis.baselines[closedMonth.cell.month - 1]
    : null;
  const unit = SOURCE_SHORT_UNITS[source];
  return (
    <article className="flex flex-col gap-4 rounded-md border border-line bg-surface p-6">
      {closedMonth && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-eyebrow text-ink-muted">{focusLabel}</p>
            <CalendarLink
              label={t("See on calendar", "Ver no calendário")}
              onClick={() => onShow(closedMonth.cell.key)}
            />
          </div>
          <h2 className="type-heading-md text-ink first-letter:uppercase">
            {monthTitle(closedMonth.cell)}
            {closedMonth.throughDay !== null &&
              t(
                `, through the ${ordinal(closedMonth.throughDay)}`,
                `, até o dia ${closedMonth.throughDay}`,
              )}
          </h2>
          {closedMonth.value === null ? (
            <p className="type-body text-ink-muted">
              {unavailableText(closedMonth, source)}
            </p>
          ) : (
            <>
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="type-stat-xl text-ink">
                  {formatCount(closedMonth.value)}
                </span>
                <span className="type-body-sm text-ink-muted">{unit}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {closedMonth.typical !== null && (
                  <DeltaBadge
                    value={closedMonth.value}
                    typical={closedMonth.typical}
                  />
                )}
                {closedMonth.rank &&
                  rankLabel(closedMonth.rank, closedMonth.cell.month) && (
                    <span className="type-body-sm text-ink-muted">
                      {t(
                        `${ordinal(closedMonth.rank.rank)} busiest ${MONTH_NAMES[closedMonth.cell.month - 1]} in ${yearsLabel(closedMonth.rank.of)}`,
                        `${closedMonth.rank.rank}º ${MONTH_NAMES[closedMonth.cell.month - 1]} mais ativo em ${yearsLabel(closedMonth.rank.of)}`,
                      )}
                    </span>
                  )}
              </div>
              {baseline && closedMonth.throughDay === null && (
                <>
                  <TypicalRange value={closedMonth.value} baseline={baseline} />
                  <p className="type-body-sm text-ink-muted tabular-nums">
                    {t(
                      <>
                        Usual range (25% to 75% of years):{" "}
                        {formatCount(baseline.p25)} to{" "}
                        {formatCount(baseline.p75)} {hotspotsWord(baseline.p75)}
                        , across {yearsLabel(baseline.years)}.
                      </>,
                      <>
                        Faixa usual (25% a 75% dos anos):{" "}
                        {formatCount(baseline.p25)} a{" "}
                        {formatCount(baseline.p75)} focos, de{" "}
                        {yearsLabel(baseline.years)}.
                      </>,
                    )}
                  </p>
                </>
              )}
            </>
          )}
        </>
      )}
      {currentMonth && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex flex-col gap-1">
            <span className="type-heading-sm flex flex-wrap items-center gap-2 text-ink first-letter:uppercase">
              {capitalized(MONTH_NAMES[currentMonth.cell.month - 1])}{" "}
              {t("so far", "até agora")}
              <span className="type-caption inline-flex h-6 items-center gap-1 rounded-sm border border-dashed border-line-strong bg-surface-raised px-2 text-ink-muted">
                <MaterialSymbol name="schedule" className="size-3.5" />
                {t("Preliminary", "Preliminar")}
              </span>
            </span>
            <span className="type-body-sm text-ink-muted">
              {t(
                `${formatDayMonth(`${currentMonth.cell.key}-01`)}-${currentMonth.throughDay}, complete days`,
                `1 a ${formatDayMonth(
                  `${currentMonth.cell.key}-${String(currentMonth.throughDay).padStart(2, "0")}`,
                )}, dias completos`,
              )}
              {currentMonth.typical !== null &&
                t(
                  ` · typical for the same days: ${formatCount(currentMonth.typical)}`,
                  ` · típico para os mesmos dias: ${formatCount(currentMonth.typical)}`,
                )}
            </span>
          </div>
          {currentMonth.value === null ? (
            <span className="type-body-sm max-w-xs text-ink-muted">
              {unavailableText(currentMonth, source)}
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <span className="font-text text-[28px] leading-8 font-semibold text-ink tabular-nums">
                {formatCount(currentMonth.value)}
              </span>
              {currentMonth.typical !== null && (
                <DeltaBadge
                  value={currentMonth.value}
                  typical={currentMonth.typical}
                />
              )}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function OutlierTable({
  calendar,
  onShow,
  focusYear,
  focusKey,
}: {
  calendar: AreaCalendar;
  onShow: (key: string) => void;
  focusYear: number | null;
  focusKey: string | null;
}) {
  const t = useTr();
  const { analysis, years, source, area } = calendar;
  const outliers = [...analysis.outliers].reverse();
  const rows = outliers.map((cell) => {
    const baseline = analysis.baselines[cell.month - 1]!;
    return {
      cell,
      typical: baseline.median,
      rank: monthRank(cell, years),
    };
  });
  const download = () =>
    downloadCsv(`heru-fora-do-padrao-${area}-${source}.csv`, [
      "ano,mes,focos,tipico,razao,posicao,anos,origem",
      ...rows.map(({ cell, typical, rank }) =>
        [
          cell.year,
          cell.month,
          cell.value,
          typical,
          (cell.value! / typical).toFixed(2),
          rank?.rank ?? "",
          rank?.of ?? "",
          cell.origin ?? "",
        ].join(","),
      ),
    ]);

  return (
    <section
      aria-labelledby="outliers-title"
      className="mt-12 flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="outliers-title" className="type-section-title text-ink">
            {t("Unusual months", "Meses fora do padrão")}
          </h2>
          <p className="type-body-sm text-ink-muted">
            {rows.length} {sinceLabel(analysis)} ·{" "}
            {t("most recent first", "do mais recente ao mais antigo")}
          </p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={rows.length === 0}
          className={`${buttonClassName({ variant: "secondary", size: "sm" })} disabled:cursor-not-allowed disabled:text-ink-disabled`}
        >
          <MaterialSymbol name="download" className="size-[18px]" />
          {t("Download CSV", "Baixar CSV")}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="type-body rounded-md border border-line bg-surface p-6 text-ink-muted">
          {t(
            "No month was unusual with the chosen filters.",
            "Nenhum mês ficou fora do padrão com os filtros escolhidos.",
          )}
        </p>
      ) : (
        <div className="relative overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr>
                {t(
                  [
                    "Month",
                    "Hotspots",
                    "Typical for the month",
                    "Difference",
                    "Rank for the month",
                    "Origin",
                    "",
                  ],
                  [
                    "Mês",
                    "Focos",
                    "Típico do mês",
                    "Diferença",
                    "Posição no mês",
                    "Origem",
                    "",
                  ],
                ).map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="type-caption px-4 py-3 font-normal text-ink-muted"
                  >
                    {column || (
                      <span className="sr-only">{t("Actions", "Ações")}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="type-body-sm text-ink">
              {rows.map(({ cell, typical, rank }) => (
                <tr
                  key={cell.key}
                  aria-current={cell.key === focusKey ? "true" : undefined}
                  className={`border-t border-line ${cell.year === focusYear ? "bg-surface-hover" : ""} ${cell.key === focusKey ? "font-semibold" : ""}`}
                >
                  <td className="px-4 py-3 first-letter:uppercase">
                    {monthTitle(cell)}
                  </td>
                  <td className="type-data px-4 py-3">
                    {formatCount(cell.value!)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCount(typical)}
                  </td>
                  <td className="px-4 py-3 text-delta-above">
                    <span className="inline-flex items-center gap-1">
                      <MaterialSymbol name="arrow_upward" className="size-4" />
                      {difference(cell.value!, typical).text}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {rank
                      ? t(
                          `${ordinal(rank.rank)} of ${rank.of}`,
                          `${rank.rank}º de ${rank.of}`,
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {cell.origin ? ORIGIN_LABELS[cell.origin] : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={t(
                        `See ${monthTitle(cell)} on calendar`,
                        `Ver ${monthTitle(cell)} no calendário`,
                      )}
                      onClick={() => onShow(cell.key)}
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-surface-hover"
                    >
                      <MaterialSymbol
                        name="calendar_month"
                        className="size-[18px]"
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Definitions({ calendar }: { calendar: AreaCalendar }) {
  const t = useTr();
  const { analysis, years, coverage } = calendar;
  const provisional = years
    .flatMap((year) => year.cells)
    .find((cell: CalendarCell) => cell.provisional);
  const current = years.at(-1)?.cells.find((cell) => cell.partial);
  const completeDate = coverage?.completeDate;
  return (
    <section
      id="como-definimos"
      aria-label={t(
        "How we define it, and read with care",
        "Como definimos e leia com cuidado",
      )}
      className="mt-12 grid scroll-mt-8 gap-6 lg:grid-cols-2"
    >
      <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-6">
        <h2 className="type-heading-md text-ink">
          {t("How we define it", "Como definimos")}
        </h2>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="type-body font-semibold text-ink">
              {t("Typical", "Típico")}
            </dt>
            <dd className="type-body text-ink-muted">
              {t(
                <>
                  The median of the same month {baselineLabel(analysis)}: half
                  the years are above it, half below.
                </>,
                <>
                  A mediana do mesmo mês {baselineLabel(analysis)}: metade dos
                  anos fica acima, metade abaixo.
                </>,
              )}
            </dd>
          </div>
          <div>
            <dt className="type-body font-semibold text-ink">
              {t("Unusual", "Fora do padrão")}
            </dt>
            <dd className="type-body text-ink-muted">
              {t(
                "Above the 90th percentile for the same month, at least twice the median, and at least 20 hotspots. The current month is not included.",
                "Acima do percentil 90 do mesmo mês, com pelo menos o dobro da mediana e no mínimo 20 focos. O mês em andamento não entra.",
              )}
            </dd>
          </div>
          <div>
            <dt className="type-body font-semibold text-ink">
              {t("Peak season", "Temporada crítica")}
            </dt>
            <dd className="type-body text-ink-muted">
              {t(
                "The shortest run of consecutive months that holds at least 75% of a typical year's hotspots.",
                "A menor sequência de meses seguidos que reúne pelo menos 75% dos focos de um ano típico.",
              )}
            </dd>
          </div>
          <div>
            <dt className="type-body font-semibold text-ink">
              {t("Anomaly calendar", "Calendário de anomalias")}
            </dt>
            <dd className="type-body text-ink-muted">
              {t(
                "Each month divided by the median of the same month. Between 0.8× and 1.25× counts as typical.",
                "Cada mês dividido pela mediana do mesmo mês. Entre 0,8× e 1,25× conta como típico.",
              )}
            </dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-6">
        <h2 className="type-heading-md text-ink">
          {t("Read with care", "Leia com cuidado")}
        </h2>
        <dl className="flex flex-col gap-3">
          {provisional && (
            <div>
              <dt className="type-body font-semibold text-ink">
                {t("Preliminary months", "Meses preliminares")}
              </dt>
              <dd className="type-body text-ink-muted">
                {t(
                  <>
                    From {monthTitle(provisional)} on, some days of the month
                    still come from near real-time (NRT) data. FIRMS replaces
                    them with the science product 2 to 4 months later, so the
                    numbers may change.
                  </>,
                  <>
                    A partir de {monthTitle(provisional)}, algum dia do mês
                    ainda é de quase tempo real. O FIRMS troca esses dados pelos
                    científicos de 2 a 4 meses depois, e os números podem mudar.
                  </>,
                )}
              </dd>
            </div>
          )}
          {current && completeDate && (
            <div>
              <dt className="type-body font-semibold text-ink">
                {t("Current month", "Mês em andamento")}
              </dt>
              <dd className="type-body text-ink-muted">
                {t(
                  <>
                    {monthTitle(current)} runs through{" "}
                    {formatDayMonth(completeDate)}, the last complete day. We
                    compare it with the sum of the same days in earlier years.
                  </>,
                  <>
                    {capitalized(MONTH_NAMES[current.month - 1])} de{" "}
                    {current.year} vai até {formatDayMonth(completeDate)}, o
                    último dia completo. Comparamos com a soma dos mesmos dias
                    nos anos anteriores.
                  </>,
                )}
              </dd>
            </div>
          )}
          <div>
            <dt className="type-body font-semibold text-ink">
              {t("Month filter", "Filtro de meses")}
            </dt>
            <dd className="type-body text-ink-muted">
              {t(
                "Turning months off changes the record and the unusual months. The peak season always uses the whole year.",
                "Desligar meses muda o recorde e os meses fora do padrão. A temporada crítica usa sempre o ano todo.",
              )}
            </dd>
          </div>
          <div>
            <dt className="type-body font-semibold text-ink">
              {t("Days in UTC", "Dias em UTC")}
            </dt>
            <dd className="type-body text-ink-muted">
              {t(
                "Months and days follow UTC time: a hotspot at 10 p.m. in Brazil falls on the next day.",
                "Os meses e os dias seguem o horário UTC: um foco das 22h no Brasil cai no dia seguinte.",
              )}
            </dd>
          </div>
        </dl>
        <a
          href="/methodology"
          className="type-button inline-flex items-center gap-1.5 self-start text-ink"
        >
          {t("See methodology", "Ver metodologia")}
          <MaterialSymbol name="arrow_forward" className="size-[18px]" />
        </a>
      </div>
    </section>
  );
}

export function AnomaliesExplorer() {
  const t = useTr();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selection = useCalendarSelection();
  const fromUrl = searchParams.has("area");
  const calendar = useAreaCalendar(
    fromUrl ? searchParams.get("area") : selection.area,
  );
  const [focusRequest, setFocusRequest] = useState<string | null>(null);
  const [periodEvidence, setPeriodEvidence] = useState(false);
  const { analysis, areaName, ready, source } = calendar;
  const urlPeriod = useMemo(
    () => periodFromSearch(searchParams),
    [searchParams],
  );
  const chosenPeriod = urlPeriod ?? selection.period;
  const scrollTo = (key: string) => setFocusRequest(`${key}#${Date.now()}`);
  const stored = selection.area === calendar.area ? selection : null;
  const requestedMonth = fromUrl
    ? searchParams.get("month")
    : (stored?.month ?? null);
  const requestedYear = fromUrl
    ? Number(searchParams.get("year")) || null
    : (stored?.year ?? null);
  const cells = calendar.years.flatMap((year) => year.cells);
  const openCell = (key: string | null) =>
    key
      ? cells.find((cell) => cell.key === key && cell.state !== "future")
      : undefined;
  const lastYear = calendar.years.at(-1)?.year ?? null;
  const closedCell = calendar.closedMonth?.cell ?? null;
  const focusCell =
    openCell(requestedMonth) ??
    (requestedYear !== null && requestedYear !== lastYear
      ? openCell(`${requestedYear}-12`)
      : undefined) ??
    closedCell;
  const chosen = focusCell !== null && focusCell.key !== closedCell?.key;
  const focus =
    focusCell === null
      ? null
      : focusCell.partial
        ? calendar.currentMonth
        : focusCell.key === closedCell?.key
          ? calendar.closedMonth
          : monthComparisonFor(focusCell, calendar.years, analysis);
  const focusYear = focusCell?.year ?? null;
  const focusKey = focusCell?.key ?? null;
  const focusLabel = !chosen
    ? t("Last full month", "Último mês completo")
    : focusCell?.partial
      ? t("Current month", "Mês em andamento")
      : t("Selected month", "Mês escolhido");

  const { lastDataDate, coverage, dailyRows, passes } = calendar;
  const completeDate = coverage?.completeDate ?? null;
  const period = lastDataDate
    ? chosenPeriod
      ? anchoredPeriod(chosenPeriod, lastDataDate)
      : presetPeriod("7d", lastDataDate)
    : null;
  const report =
    period && dailyRows && completeDate && ready
      ? periodReport(
          dailyRows,
          calendar.years,
          analysis,
          source,
          passes,
          period,
          completeDate,
        )
      : null;

  useEffect(() => {
    if (ready && focusYear !== null) {
      rememberSelection({
        area: calendar.area,
        year: focusYear,
        ...(urlPeriod ? { period: urlPeriod } : {}),
      });
    }
  }, [ready, calendar.area, focusYear, urlPeriod]);

  const show = (key: string) => {
    selectMonth(key);
    scrollTo(key);
  };
  const selectMonth = (key: string) => {
    rememberSelection({
      area: calendar.area,
      year: Number(key.slice(0, 4)),
      month: key,
    });
    router.replace(
      anomaliesHref({
        area: calendar.area,
        year: Number(key.slice(0, 4)),
        month: key,
        period: chosenPeriod,
      }),
      { scroll: false },
    );
  };

  const latestOutlier = analysis.outliers.at(-1);
  const yearOutliers =
    focusYear === null
      ? []
      : analysis.outliers.filter((cell) => cell.year === focusYear);
  const season = seasonSummary(analysis);
  const record = recordSummary(analysis, SOURCE_SHORT_UNITS[source]);
  const completeTotals = calendar.years
    .filter((year) => year.year <= analysis.lastBaselineYear)
    .flatMap((year) => {
      const total = analysis.totals.get(year.year);
      return total?.complete && total.total !== null
        ? [{ year: year.year, total: total.total }]
        : [];
    });
  const focusTotal = completeTotals.find((entry) => entry.year === focusYear);
  const focusYearRank = focusTotal
    ? 1 +
      completeTotals.filter((entry) => entry.total > focusTotal.total).length
    : null;
  const seasonStart = analysis.season?.months[0];
  const seasonCell =
    seasonStart === undefined
      ? undefined
      : calendar.years
          .map((year) => year.cells[seasonStart])
          .findLast((cell) => cell.state !== "future");
  const recordCell = peakMonth(
    calendar.years.find((year) => year.year === analysis.record?.year),
  );

  return (
    <main className="mx-auto max-w-[1328px] px-4 pt-8 pb-24 sm:px-8 lg:px-16 lg:pt-12">
      <header className="flex flex-col gap-2">
        <p className="type-eyebrow text-ink-muted">
          {t("Anomalies", "Anomalias")}
        </p>
        <h1 className="type-heading-lg min-h-9 text-ink">
          {areaName &&
            t(
              `${areaName}: what is unusual${focusYear && chosen ? ` in ${focusYear}` : ""}?`,
              `${areaName}: o que está fora do normal${focusYear && chosen ? ` em ${focusYear}` : ""}?`,
            )}
        </h1>
        <p className="type-body max-w-[720px] text-ink-muted">
          {chosen && focusCell
            ? t(
                `Showing ${monthTitle(focusCell)} against what is typical for the time of year. Click another month in the calendar to switch; the unusual months ${sinceLabel(analysis)} are at the end of the page.`,
                `Mostrando ${monthTitle(focusCell)} contra o típico para a época. Clique em outro mês do calendário para trocar; os meses que fugiram do padrão ${sinceLabel(analysis)} estão no fim da página.`,
              )
            : t(
                `Compare the last month with what is typical for the time of year, and see the unusual months ${sinceLabel(analysis)}. Click a month in the calendar to analyze it.`,
                `Compare o último mês com o típico para a época e veja os meses que fugiram do padrão ${sinceLabel(analysis)}. Clique num mês do calendário para analisá-lo.`,
              )}{" "}
          <a href="#como-definimos" className="text-link hover:underline">
            {t("How we define it", "Como definimos")}
          </a>
        </p>
      </header>

      {ready && (
        <section
          aria-label={t("Anomaly summary", "Resumo das anomalias")}
          className="mt-10 grid gap-6 lg:grid-cols-3"
        >
          <div className="flex flex-col gap-6 lg:col-span-2">
            <MonthOverview
              calendar={calendar}
              focus={focus}
              focusLabel={focusLabel}
              showCurrent={!chosen}
              onShow={show}
            />
            {report && period && (
              <PeriodCard
                report={
                  chosenPeriod
                    ? {
                        ...report,
                        eyebrow: t(
                          `Date filter: ${report.eyebrow}`,
                          `Filtro de data: ${report.eyebrow}`,
                        ),
                      }
                    : report
                }
                onEvidence={() => setPeriodEvidence(true)}
              />
            )}
          </div>
          <div className="flex flex-col gap-6">
            <ReportCard
              eyebrow={t("Peak season", "Temporada crítica")}
              icon="event"
              className=""
            >
              <h3 className="type-heading-md text-ink first-letter:uppercase">
                {season.title}
              </h3>
              <p className="type-body text-ink-muted">{season.text}</p>
              {seasonCell && (
                <CalendarLink
                  label={t("See on calendar", "Ver no calendário")}
                  onClick={() => show(seasonCell.key)}
                />
              )}
            </ReportCard>
            <ReportCard
              eyebrow={t("Record year", "Ano recorde")}
              icon="bar_chart"
              className=""
            >
              <h3 className="type-heading-md text-ink">{record.title}</h3>
              <p className="type-body text-ink-muted">
                {record.text}
                {focusYearRank !== null &&
                  focusYear !== analysis.record?.year &&
                  (focusYearRank === completeTotals.length
                    ? t(
                        ` ${focusYear} was the least active year in ${yearsLabel(completeTotals.length)}.`,
                        ` ${focusYear} foi o ano menos ativo em ${yearsLabel(completeTotals.length)}.`,
                      )
                    : t(
                        ` ${focusYear} was the ${ordinal(focusYearRank)} busiest year in ${yearsLabel(completeTotals.length)}.`,
                        ` ${focusYear} foi o ${focusYearRank}º ano mais ativo em ${yearsLabel(completeTotals.length)}.`,
                      ))}
              </p>
              {recordCell && (
                <CalendarLink
                  label={t("See on calendar", "Ver no calendário")}
                  onClick={() => show(recordCell.key)}
                />
              )}
            </ReportCard>
            <ReportCard
              eyebrow={
                focusYear !== null
                  ? t(
                      `Unusual in ${focusYear}`,
                      `Fora do padrão em ${focusYear}`,
                    )
                  : t("Unusual months", "Meses fora do padrão")
              }
              icon="flag"
              className=""
            >
              <h3 className="type-heading-md text-ink">
                {focusYear !== null
                  ? yearOutliers.length === 0
                    ? t("No months", "Nenhum mês")
                    : monthsLabel(yearOutliers.length)
                  : analysis.outliers.length}
              </h3>
              <p className="type-body text-ink-muted">
                {yearOutliers.length > 0 &&
                  `${capitalized(yearOutliers.map((cell) => MONTH_NAMES[cell.month - 1]).join(", "))}. `}
                {t(
                  `${capitalized(sinceLabel(analysis))}, there ${analysis.outliers.length === 1 ? "was" : "were"} ${analysis.outliers.length}.`,
                  `${capitalized(sinceLabel(analysis))}, foram ${analysis.outliers.length}.`,
                )}
                {latestOutlier &&
                  t(
                    ` The most recent was ${monthTitle(latestOutlier)}.`,
                    ` O mais recente foi ${monthTitle(latestOutlier)}.`,
                  )}
              </p>
              {(yearOutliers[0] ?? latestOutlier) && (
                <CalendarLink
                  label={t("See on calendar", "Ver no calendário")}
                  onClick={() => show((yearOutliers[0] ?? latestOutlier)!.key)}
                />
              )}
            </ReportCard>
          </div>
        </section>
      )}

      {periodEvidence && ready && (
        <ReportEvidence
          kind="period"
          calendar={calendar}
          period={report}
          onClose={() => setPeriodEvidence(false)}
          onShow={(key) => {
            setPeriodEvidence(false);
            show(key);
          }}
        />
      )}

      <CalendarSection
        calendar={calendar}
        onAreaChange={(next) =>
          router.replace(
            anomaliesHref({
              area: next,
              year: focusYear,
              month: chosen ? focusKey : null,
              period: chosenPeriod,
            }),
            { scroll: false },
          )
        }
        title={t("Anomaly calendar", "Calendário de anomalias")}
        description={t(
          `Each month against the median of the same month ${baselineLabel(analysis)}. Blue is below typical; red, above.`,
          `Cada mês contra a mediana do mesmo mês ${baselineLabel(analysis)}. Azul fica abaixo do típico; vermelho, acima.`,
        )}
        initialMode="anomaly"
        focusRequest={focusRequest}
        selectedMonth={focusKey}
        onSelectMonth={selectMonth}
      />

      {ready && (
        <OutlierTable
          calendar={calendar}
          onShow={show}
          focusYear={focusYear}
          focusKey={focusKey}
        />
      )}
      {ready && <Definitions calendar={calendar} />}

      <DataFootnote updatedAt={calendar.updatedAt} />
    </main>
  );
}
