"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  type CalendarBar,
  startCalendarBars,
} from "@/calendar-3d/calendar-bars-scene";
import {
  formatHotspots,
  MONTH_ABBREVIATIONS,
  monthTitle,
} from "./calendar-labels";
import type { CalendarCell, CalendarYear } from "./calendar-matrix";
import { type CalendarAnalysis, heatLevel } from "./calendar-statistics";

const STATE_DESCRIPTIONS: Partial<Record<CalendarCell["state"], string>> = {
  "no-data": "sem dados",
  computing: "em cálculo",
  loading: "carregando",
  future: "ainda não aconteceu",
};

function barLabel(cell: CalendarCell, outlier: boolean): string {
  const parts = [
    cell.state === "value" || cell.state === "zero"
      ? formatHotspots(cell.value ?? 0)
      : (STATE_DESCRIPTIONS[cell.state] ?? ""),
  ];
  if (outlier) parts.push("fora do padrão");
  if (cell.provisional) parts.push("preliminar");
  if (cell.partial) parts.push("parcial");
  return `${monthTitle(cell)}: ${parts.join(", ")}`;
}

export function Calendar3D({
  areaName,
  years,
  analysis,
  enabledMonths,
}: {
  areaName: string;
  years: CalendarYear[];
  analysis: CalendarAnalysis;
  enabledMonths: boolean[];
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const bars = useMemo<CalendarBar[]>(() => {
    const outlierKeys = new Set(analysis.outliers.map((cell) => cell.key));
    return years.flatMap((year, row) =>
      year.cells.map((cell) => {
        const hasValue = cell.state === "value" || cell.state === "zero";
        const outlier = outlierKeys.has(cell.key);
        return {
          row,
          month: cell.month - 1,
          count: hasValue ? (cell.value ?? 0) : null,
          heat:
            cell.state === "value" && cell.value
              ? heatLevel(cell.value, analysis.breaks)
              : 0,
          outOfPattern: outlier,
          inProgress: cell.partial && hasValue,
          label: barLabel(cell, outlier),
          dimmed: !enabledMonths[cell.month - 1],
        };
      }),
    );
  }, [years, analysis, enabledMonths]);

  const yearLabels = useMemo(
    () => years.map(({ year }) => String(year)),
    [years],
  );

  useEffect(
    () =>
      startCalendarBars(stageRef.current!, canvasRef.current!, bars, {
        months: [...MONTH_ABBREVIATIONS],
        years: yearLabels,
        tooltip: tooltipRef.current!,
      }),
    [bars, yearLabels],
  );

  return (
    <div
      ref={stageRef}
      role="img"
      aria-label={`Calendário de fontes de calor em 3D, ${areaName}: cada coluna é um mês e cada fileira um ano; a altura e a cor mostram a quantidade de focos. Para ler os valores, use a visão em grade.`}
      className="relative aspect-[4/5] touch-none overflow-hidden rounded-md bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,255,255,0.05),transparent_70%)] select-none sm:aspect-[16/11]"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 size-full cursor-grab"
      />
      <span
        ref={tooltipRef}
        aria-hidden="true"
        className="type-body-sm pointer-events-none absolute top-0 left-0 rounded-sm border border-line bg-surface-ground/90 px-2.5 py-1.5 whitespace-nowrap text-ink opacity-0 backdrop-blur-sm transition-opacity duration-150"
      />
      <span
        aria-hidden="true"
        className="type-caption pointer-events-none absolute top-2 right-2 rounded-full bg-surface-ground/70 px-2 py-0.5 tracking-normal text-ink-disabled normal-case"
      >
        arraste para girar · passe o mouse para ver os valores
      </span>
    </div>
  );
}
