"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { buttonClassName } from "@/button/button-class-name";
import {
  baselineLabel,
  capitalized,
  formatCount,
  formatDayMonth,
  MONTH_NAMES,
  monthTitle,
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
  type AreaCalendar,
  useAreaCalendar,
} from "@/fire-calendar/use-area-calendar";
import { MaterialSymbol } from "@/icons/material-symbols";

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
  const top = Math.max(value, baseline.p90, 1) * 1.15;
  const at = (amount: number) => `${(amount / top) * 100}%`;
  return (
    <figure
      role="img"
      aria-label={`${formatCount(value)} focos. Típico ${formatCount(baseline.median)}. Faixa usual de ${formatCount(baseline.p25)} a ${formatCount(baseline.p75)}.`}
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
          típico
          <br />
          {formatCount(baseline.median)}
        </span>
        <span
          className="absolute -translate-x-1/2 text-center font-semibold whitespace-nowrap text-ink"
          style={{ left: at(value) }}
        >
          este mês
          <br />
          {formatCount(value)}
        </span>
      </div>
    </figure>
  );
}

function MonthOverview({
  calendar,
  onShow,
}: {
  calendar: AreaCalendar;
  onShow: (key: string) => void;
}) {
  const { closedMonth, currentMonth, analysis, source } = calendar;
  const baseline = closedMonth
    ? analysis.baselines[closedMonth.cell.month - 1]
    : null;
  const unit = SOURCE_SHORT_UNITS[source];
  return (
    <article className="flex flex-col gap-4 rounded-md border border-line bg-surface p-6 lg:col-span-2 lg:row-span-3">
      {closedMonth && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-eyebrow text-ink-muted">Último mês completo</p>
            <CalendarLink
              label="Ver no calendário"
              onClick={() => onShow(closedMonth.cell.key)}
            />
          </div>
          <h2 className="type-heading-md text-ink first-letter:uppercase">
            {monthTitle(closedMonth.cell)}
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
                      {`${closedMonth.rank.rank}º ${MONTH_NAMES[closedMonth.cell.month - 1]} mais ativo em ${yearsLabel(closedMonth.rank.of)}`}
                    </span>
                  )}
              </div>
              {baseline && (
                <>
                  <TypicalRange value={closedMonth.value} baseline={baseline} />
                  <p className="type-body-sm text-ink-muted tabular-nums">
                    Faixa usual (25% a 75% dos anos):{" "}
                    {formatCount(baseline.p25)} a {formatCount(baseline.p75)}{" "}
                    focos, de {yearsLabel(baseline.years)}.
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
              {capitalized(MONTH_NAMES[currentMonth.cell.month - 1])} até agora
              <span className="type-caption inline-flex h-6 items-center gap-1 rounded-sm border border-dashed border-line-strong bg-surface-raised px-2 text-ink-muted">
                <MaterialSymbol name="schedule" className="size-3.5" />
                Preliminar
              </span>
            </span>
            <span className="type-body-sm text-ink-muted">
              1 a{" "}
              {formatDayMonth(
                `${currentMonth.cell.key}-${String(currentMonth.throughDay).padStart(2, "0")}`,
              )}
              , dias completos
              {currentMonth.typical !== null &&
                ` · típico para os mesmos dias: ${formatCount(currentMonth.typical)}`}
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
}: {
  calendar: AreaCalendar;
  onShow: (key: string) => void;
}) {
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
            Meses fora do padrão
          </h2>
          <p className="type-body-sm text-ink-muted">
            {rows.length} {sinceLabel(analysis)} · do mais recente ao mais
            antigo
          </p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={rows.length === 0}
          className={`${buttonClassName({ variant: "secondary", size: "sm" })} disabled:cursor-not-allowed disabled:text-ink-disabled`}
        >
          <MaterialSymbol name="download" className="size-[18px]" />
          Baixar CSV
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="type-body rounded-md border border-line bg-surface p-6 text-ink-muted">
          Nenhum mês ficou fora do padrão com os filtros escolhidos.
        </p>
      ) : (
        <div className="relative overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr>
                {[
                  "Mês",
                  "Focos",
                  "Típico do mês",
                  "Diferença",
                  "Posição no mês",
                  "Origem",
                  "",
                ].map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="type-caption px-4 py-3 font-normal text-ink-muted"
                  >
                    {column || <span className="sr-only">Ações</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="type-body-sm text-ink">
              {rows.map(({ cell, typical, rank }) => (
                <tr key={cell.key} className="border-t border-line">
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
                    {rank ? `${rank.rank}º de ${rank.of}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {cell.origin ? ORIGIN_LABELS[cell.origin] : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`Ver ${monthTitle(cell)} no calendário`}
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
  const { analysis, years, coverage } = calendar;
  const provisional = years
    .flatMap((year) => year.cells)
    .find((cell: CalendarCell) => cell.provisional);
  const current = years.at(-1)?.cells.find((cell) => cell.partial);
  const completeDate = coverage?.completeDate;
  return (
    <section
      id="como-definimos"
      aria-label="Como definimos e leia com cuidado"
      className="mt-12 grid scroll-mt-8 gap-6 lg:grid-cols-2"
    >
      <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-6">
        <h2 className="type-heading-md text-ink">Como definimos</h2>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="type-body font-semibold text-ink">Típico</dt>
            <dd className="type-body text-ink-muted">
              A mediana do mesmo mês {baselineLabel(analysis)}: metade dos anos
              fica acima, metade abaixo.
            </dd>
          </div>
          <div>
            <dt className="type-body font-semibold text-ink">Fora do padrão</dt>
            <dd className="type-body text-ink-muted">
              Acima do percentil 90 do mesmo mês, com pelo menos o dobro da
              mediana e no mínimo 20 focos. O mês em andamento não entra.
            </dd>
          </div>
          <div>
            <dt className="type-body font-semibold text-ink">
              Temporada crítica
            </dt>
            <dd className="type-body text-ink-muted">
              A menor sequência de meses seguidos que reúne pelo menos 75% dos
              focos de um ano típico.
            </dd>
          </div>
          <div>
            <dt className="type-body font-semibold text-ink">
              Calendário de anomalias
            </dt>
            <dd className="type-body text-ink-muted">
              Cada mês dividido pela mediana do mesmo mês. Entre 0,8× e 1,25×
              conta como típico.
            </dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-6">
        <h2 className="type-heading-md text-ink">Leia com cuidado</h2>
        <dl className="flex flex-col gap-3">
          {provisional && (
            <div>
              <dt className="type-body font-semibold text-ink">
                Meses preliminares
              </dt>
              <dd className="type-body text-ink-muted">
                A partir de {monthTitle(provisional)}, algum dia do mês ainda é
                de quase tempo real. O FIRMS troca esses dados pelos científicos
                de 2 a 4 meses depois, e os números podem mudar.
              </dd>
            </div>
          )}
          {current && completeDate && (
            <div>
              <dt className="type-body font-semibold text-ink">
                Mês em andamento
              </dt>
              <dd className="type-body text-ink-muted">
                {capitalized(MONTH_NAMES[current.month - 1])} de {current.year}{" "}
                vai até {formatDayMonth(completeDate)}, o último dia completo.
                Comparamos com a soma dos mesmos dias nos anos anteriores.
              </dd>
            </div>
          )}
          <div>
            <dt className="type-body font-semibold text-ink">
              Filtro de meses
            </dt>
            <dd className="type-body text-ink-muted">
              Desligar meses muda o recorde e os meses fora do padrão. A
              temporada crítica usa sempre o ano todo.
            </dd>
          </div>
          <div>
            <dt className="type-body font-semibold text-ink">Dias em UTC</dt>
            <dd className="type-body text-ink-muted">
              Os meses e os dias seguem o horário UTC: um foco das 22h no Brasil
              cai no dia seguinte.
            </dd>
          </div>
        </dl>
        <a
          href="/methodology"
          className="type-button inline-flex items-center gap-1.5 self-start text-ink"
        >
          Ver metodologia
          <MaterialSymbol name="arrow_forward" className="size-[18px]" />
        </a>
      </div>
    </section>
  );
}

export function AnomaliesExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const calendar = useAreaCalendar(searchParams.get("area"));
  const [focusRequest, setFocusRequest] = useState<string | null>(null);
  const { analysis, areaName, ready, source } = calendar;
  const show = (key: string) => setFocusRequest(`${key}#${Date.now()}`);
  const latestOutlier = analysis.outliers.at(-1);
  const season = seasonSummary(analysis);
  const record = recordSummary(analysis, SOURCE_SHORT_UNITS[source]);
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
        <p className="type-eyebrow text-ink-muted">Anomalias</p>
        <h1 className="type-heading-lg min-h-9 text-ink">
          {areaName && `${areaName}: o que está fora do normal?`}
        </h1>
        <p className="type-body max-w-[720px] text-ink-muted">
          Compare o último mês com o típico para a época e veja os meses que
          fugiram do padrão {sinceLabel(analysis)}.{" "}
          <a href="#como-definimos" className="text-link hover:underline">
            Como definimos
          </a>
        </p>
      </header>

      {ready && (
        <section
          aria-label="Resumo das anomalias"
          className="mt-10 grid gap-6 lg:grid-cols-3"
        >
          <MonthOverview calendar={calendar} onShow={show} />
          <ReportCard eyebrow="Temporada crítica" icon="event" className="">
            <h3 className="type-heading-md text-ink first-letter:uppercase">
              {season.title}
            </h3>
            <p className="type-body text-ink-muted">{season.text}</p>
            {seasonCell && (
              <CalendarLink
                label="Ver no calendário"
                onClick={() => show(seasonCell.key)}
              />
            )}
          </ReportCard>
          <ReportCard eyebrow="Ano recorde" icon="bar_chart" className="">
            <h3 className="type-heading-md text-ink">{record.title}</h3>
            <p className="type-body text-ink-muted">{record.text}</p>
            {recordCell && (
              <CalendarLink
                label="Ver no calendário"
                onClick={() => show(recordCell.key)}
              />
            )}
          </ReportCard>
          <ReportCard eyebrow="Meses fora do padrão" icon="flag" className="">
            <h3 className="type-heading-md text-ink">
              {analysis.outliers.length}
            </h3>
            <p className="type-body text-ink-muted">
              {capitalized(sinceLabel(analysis))}.
              {latestOutlier &&
                ` O mais recente foi ${monthTitle(latestOutlier)}.`}
            </p>
            {latestOutlier && (
              <CalendarLink
                label="Ver no calendário"
                onClick={() => show(latestOutlier.key)}
              />
            )}
          </ReportCard>
        </section>
      )}

      <CalendarSection
        calendar={calendar}
        onAreaChange={(next) =>
          router.replace(`/anomalies?area=${next}`, { scroll: false })
        }
        title="Calendário de anomalias"
        description={`Cada mês contra a mediana do mesmo mês ${baselineLabel(analysis)}. Azul fica abaixo do típico; vermelho, acima.`}
        initialMode="anomaly"
        focusRequest={focusRequest}
      />

      {ready && <OutlierTable calendar={calendar} onShow={show} />}
      {ready && <Definitions calendar={calendar} />}

      <DataFootnote updatedAt={calendar.updatedAt} />
    </main>
  );
}
