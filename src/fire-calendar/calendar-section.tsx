"use client";

import Link from "next/link";
<<<<<<< HEAD
import { type ReactNode, useState } from "react";
=======
import { useState } from "react";
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
import { MaterialSymbol } from "@/icons/material-symbols";
import { reloadPipelineFile } from "@/pipeline/pipeline-files";
import { CALENDAR_MODES, type CalendarMode } from "./calendar-anomaly";
import { Calendar3D } from "./calendar-3d";
import { CalendarFilters, type CalendarView } from "./calendar-filters";
import { CalendarGrid } from "./calendar-grid";
import {
  enabledMonthsLabel,
  formatUpdatedAt,
  PASSES_DESCRIPTIONS,
  SOURCE_UNITS,
} from "./calendar-labels";
import type { CellState } from "./calendar-matrix";
import { HeatLegend } from "./heat-legend";
import { SegmentedChoice } from "./segmented-choice";
import type { AreaCalendar } from "./use-area-calendar";

function CalendarMessage({
  title,
  text,
  onRetry,
}: {
  title: string;
  text: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role={onRetry ? "alert" : "status"}
      className="flex flex-col items-start gap-3 rounded-lg border border-line bg-linear-to-b from-surface-hover/60 to-surface p-6"
    >
      <p className="type-heading-sm flex items-center gap-2 text-ink">
        <MaterialSymbol
          name={onRetry ? "error" : "progress_activity"}
          className={`size-5 ${onRetry ? "text-alert" : "animate-spin text-ink-muted"}`}
        />
        {title}
      </p>
      <p className="type-body text-ink-muted">{text}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="type-button inline-flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-line-strong bg-surface-raised px-4 text-ink transition-colors duration-120 ease-standard hover:border-ink"
        >
          <MaterialSymbol name="refresh" className="size-[18px]" />
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function downloadCsv(fileName: string, lines: string[]) {
  const url = URL.createObjectURL(
    new Blob([lines.join("\n")], { type: "text/csv" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

type YearSpan = "recent" | "all" | "custom";

const RECENT_YEARS = 10;

const YEAR_SPANS: { value: YearSpan; label: string }[] = [
  { value: "recent", label: "Últimos 10 anos" },
  { value: "all", label: "Todos os anos" },
];

export function CalendarSection({
  calendar,
  onAreaChange,
  title,
  description,
  initialMode,
  focusRequest,
<<<<<<< HEAD
  selectedMonth = null,
  onSelectMonth,
  selectionAction,
=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
}: {
  calendar: AreaCalendar;
  onAreaChange: (area: string) => void;
  title: string;
  description: string;
  initialMode: CalendarMode;
  focusRequest: string | null;
<<<<<<< HEAD
  selectedMonth?: string | null;
  onSelectMonth?: (key: string) => void;
  selectionAction?: ReactNode;
=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
}) {
  const [mode, setMode] = useState(initialMode);
  const latestYear = calendar.years.at(-1)?.year ?? null;
  const yearSpan: YearSpan =
    latestYear !== null &&
    calendar.yearRange.first === latestYear - RECENT_YEARS + 1 &&
    calendar.yearRange.last === latestYear
      ? "recent"
      : calendar.yearRange.first === calendar.years[0]?.year &&
          calendar.yearRange.last === latestYear
        ? "all"
        : "custom";
  const [view, setView] = useState<CalendarView>("3d");
  const [handledFocus, setHandledFocus] = useState(focusRequest);
  if (focusRequest !== handledFocus) {
    setHandledFocus(focusRequest);
    if (focusRequest) {
      setView("grid");
    }
  }
  const showIn3D = mode === "count" && view === "3d";
  const {
    analysis,
    visibleYears,
    enabledMonths,
    source,
    passes,
    area,
    ready,
    failedPaths,
    lastDataDate,
  } = calendar;
  const outlierKeys = new Set(analysis.outliers.map((cell) => cell.key));
  const states = new Set<CellState>(
    visibleYears.flatMap((year) => year.cells.map((cell) => cell.state)),
  );

  const downloadCalendar = () =>
    downloadCsv(`heru-calendario-${area}-${source}-${passes}.csv`, [
      "ano,mes,valor,estado,origem,parcial,preliminar,fora_do_padrao",
      ...visibleYears.flatMap((year) =>
        year.cells
          .filter(
            (cell, index) => enabledMonths[index] && cell.state !== "future",
          )
          .map((cell) =>
            [
              cell.year,
              cell.month,
              cell.value ?? "",
              cell.state,
              cell.origin ?? "",
              cell.partial ? 1 : 0,
              cell.provisional ? 1 : 0,
              outlierKeys.has(cell.key) ? 1 : 0,
            ].join(","),
          ),
      ),
    ]);

  return (
    <section
      id="calendario"
      aria-labelledby="calendar-title"
      className="mt-12 flex scroll-mt-8 flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="calendar-title" className="type-section-title text-ink">
            {title}
          </h2>
          <p className="type-body-sm text-ink-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedChoice
            label="Modo do calendário"
            options={CALENDAR_MODES}
            value={mode}
            onChange={setMode}
          />
          {latestYear !== null && (
            <div className="md:hidden">
              <SegmentedChoice
                label="Anos exibidos"
                options={YEAR_SPANS}
                value={yearSpan}
                onChange={(span) =>
                  calendar.setYearRange(
                    span === "recent"
                      ? {
                          first: latestYear - RECENT_YEARS + 1,
                          last: latestYear,
                        }
                      : null,
                  )
                }
              />
            </div>
          )}
        </div>
      </div>
      <CalendarFilters
        areaOptions={calendar.areaOptions}
        area={area}
        onAreaChange={onAreaChange}
        source={source}
        onSourceChange={calendar.setSource}
        passes={passes}
        onPassesChange={calendar.setPasses}
        years={calendar.years.map((year) => year.year)}
        yearRange={calendar.yearRange}
        onYearRangeChange={calendar.setYearRange}
        enabledMonths={enabledMonths}
        onToggleMonth={calendar.toggleMonth}
        onClear={calendar.clearFilters}
        onDownload={ready ? downloadCalendar : null}
        view={mode === "count" ? view : undefined}
        onViewChange={mode === "count" ? setView : undefined}
        unitLine={`${SOURCE_UNITS[source]} · ${PASSES_DESCRIPTIONS[passes]} · ${enabledMonthsLabel(enabledMonths)}`}
        notice={
          !calendar.sourceChosen && source === "modis"
            ? "O valor harmonizado desta região ainda está em cálculo. Mostrando só MODIS até ele sair."
            : null
        }
      />
      {failedPaths.length > 0 ? (
        <CalendarMessage
          title="Não conseguimos carregar o calendário agora."
          text="A fonte dos dados não respondeu. Seus filtros continuam salvos."
          onRetry={() => failedPaths.forEach(reloadPipelineFile)}
        />
      ) : !ready || !lastDataDate ? (
        <CalendarMessage
          title="Carregando o calendário"
          text="Lendo a série mensal da região."
        />
      ) : (
        <div className="rounded-lg border border-line bg-linear-to-b from-surface-hover/50 to-surface p-3 shadow-[0_12px_32px_rgba(0,0,0,0.35)] sm:p-6">
          {showIn3D ? (
            <Calendar3D
              areaName={calendar.areaName}
              years={visibleYears}
              analysis={analysis}
              enabledMonths={enabledMonths}
            />
          ) : (
            <CalendarGrid
              areaName={calendar.areaName}
              years={visibleYears}
              allYears={calendar.years}
              analysis={analysis}
              enabledMonths={enabledMonths}
              source={source}
              lastDataDate={lastDataDate}
              mode={mode}
              focusRequest={focusRequest}
<<<<<<< HEAD
              selectedKey={selectedMonth}
              onSelect={onSelectMonth && ((cell) => onSelectMonth(cell.key))}
            />
          )}
          {selectionAction}
=======
            />
          )}
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
          <HeatLegend breaks={analysis.breaks} states={states} mode={mode} />
        </div>
      )}
    </section>
  );
}

export function DataFootnote({ updatedAt }: { updatedAt: string | null }) {
  return (
    <p className="type-body-sm mt-8 flex flex-wrap gap-x-4 gap-y-1 text-ink-muted">
      <span>
        Dados: NASA FIRMS, MODIS (desde 2003) e VIIRS (desde 2012), harmonizados
        para equivalente VIIRS.
        {updatedAt && ` Atualizado em ${formatUpdatedAt(updatedAt)}.`}
      </span>
      <Link href="/methodology" className="text-link hover:underline">
        Como harmonizamos
      </Link>
    </p>
  );
}
