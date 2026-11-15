"use client";

import Link from "next/link";
import { useState } from "react";
import { MaterialSymbol } from "@/icons/material-symbols";
import { reloadPipelineFile } from "@/pipeline/pipeline-files";
import { CALENDAR_MODES, type CalendarMode } from "./calendar-anomaly";
import { CalendarFilters } from "./calendar-filters";
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
      className="flex flex-col items-start gap-3 rounded-md border border-line bg-surface p-6"
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

export function CalendarSection({
  calendar,
  onAreaChange,
  title,
  description,
  initialMode,
  focusRequest,
}: {
  calendar: AreaCalendar;
  onAreaChange: (area: string) => void;
  title: string;
  description: string;
  initialMode: CalendarMode;
  focusRequest: string | null;
}) {
  const [mode, setMode] = useState(initialMode);
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
        <SegmentedChoice
          label="Modo do calendário"
          options={CALENDAR_MODES}
          value={mode}
          onChange={setMode}
        />
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
        <div className="rounded-md border border-line bg-surface p-3 sm:p-6">
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
          />
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
