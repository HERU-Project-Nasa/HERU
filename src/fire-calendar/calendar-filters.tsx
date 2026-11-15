import type { ReactNode } from "react";
import { MaterialSymbol } from "@/icons/material-symbols";
import {
  MONTH_INITIALS,
  MONTH_NAMES,
  PASSES_OPTIONS,
  SOURCE_OPTIONS,
} from "./calendar-labels";
import type { CalendarPasses, CalendarSource } from "./calendar-matrix";
import { SegmentedChoice } from "./segmented-choice";

export type AreaOption = { value: string; label: string };

export type YearRange = { first: number; last: number };

export type CalendarView = "3d" | "grid";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "3d", label: "3D" },
  { value: "grid", label: "Grade" },
];

const SELECT_CLASS_NAME =
  "type-chip h-10 cursor-pointer appearance-none rounded-md border border-line-strong bg-surface-ground/60 text-ink transition-colors duration-200 ease-standard hover:border-ink";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="type-caption text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function YearSelect({
  label,
  value,
  years,
  onChange,
}: {
  label: string;
  value: number;
  years: number[];
  onChange: (year: number) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className={`${SELECT_CLASS_NAME} w-full min-w-[5rem] px-3 text-center sm:w-[5.25rem]`}
    >
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}

export function CalendarFilters({
  areaOptions,
  area,
  onAreaChange,
  source,
  onSourceChange,
  passes,
  onPassesChange,
  years,
  yearRange,
  onYearRangeChange,
  enabledMonths,
  onToggleMonth,
  onClear,
  onDownload,
  unitLine,
  notice,
  view,
  onViewChange,
}: {
  areaOptions: AreaOption[];
  area: string;
  onAreaChange: (area: string) => void;
  source: CalendarSource;
  onSourceChange: (source: CalendarSource) => void;
  passes: CalendarPasses;
  onPassesChange: (passes: CalendarPasses) => void;
  years: number[];
  yearRange: YearRange;
  onYearRangeChange: (range: YearRange) => void;
  enabledMonths: boolean[];
  onToggleMonth: (index: number) => void;
  onClear: () => void;
  onDownload: (() => void) | null;
  unitLine: string;
  notice: string | null;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}) {
  return (
    <section
      aria-label="Filtros do calendário"
      className="flex flex-col gap-5 rounded-lg border border-line bg-linear-to-b from-surface-hover/50 to-surface p-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)] sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <p className="type-caption flex items-center gap-2 text-ink-muted">
          <MaterialSymbol name="tune" className="size-[18px]" />
          Ajustes do calendário
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <SegmentedChoice
            label="Visualização"
            options={VIEW_OPTIONS}
            value={view}
            onChange={onViewChange}
          />
          <button
            type="button"
            onClick={onClear}
            className="type-button inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent px-3 text-ink-muted transition-colors duration-200 ease-standard hover:bg-surface-hover hover:text-ink sm:flex-none"
          >
            <MaterialSymbol name="refresh" className="size-[18px]" />
            Limpar
          </button>
          <button
            type="button"
            onClick={onDownload ?? undefined}
            disabled={!onDownload}
            className="type-button inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-line-strong bg-surface-raised px-4 text-ink transition-colors duration-200 ease-standard hover:border-ink disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:border-line-strong sm:flex-none"
          >
            <MaterialSymbol name="download" className="size-[18px]" />
            Baixar CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_auto_auto_auto] xl:items-end">
        <Field label="Região">
          <span className="relative flex w-full items-center">
            <MaterialSymbol
              name="location_on"
              className="pointer-events-none absolute left-3 size-[18px] text-ink-muted"
            />
            <select
              aria-label="Região"
              value={area}
              disabled={areaOptions.length === 0}
              onChange={(event) => onAreaChange(event.target.value)}
              className={`${SELECT_CLASS_NAME} w-full pr-9 pl-9 disabled:cursor-not-allowed`}
            >
              {areaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <MaterialSymbol
              name="keyboard_arrow_down"
              className="pointer-events-none absolute right-3 size-[18px] text-ink-muted"
            />
          </span>
        </Field>
        <Field label="Fonte">
          <SegmentedChoice
            label="Fonte"
            options={SOURCE_OPTIONS}
            value={source}
            onChange={onSourceChange}
          />
        </Field>
        <Field label="Passagens">
          <SegmentedChoice
            label="Passagens"
            options={PASSES_OPTIONS}
            value={passes}
            onChange={onPassesChange}
          />
        </Field>
        <Field label="Anos">
          <span className="flex items-center gap-2">
            <YearSelect
              label="Primeiro ano"
              value={yearRange.first}
              years={years.filter((year) => year <= yearRange.last)}
              onChange={(first) => onYearRangeChange({ ...yearRange, first })}
            />
            <span className="type-body-sm text-ink-muted">a</span>
            <YearSelect
              label="Último ano"
              value={yearRange.last}
              years={years.filter((year) => year >= yearRange.first)}
              onChange={(last) => onYearRangeChange({ ...yearRange, last })}
            />
          </span>
        </Field>
      </div>

      <Field label="Meses">
        <div
          role="group"
          aria-label="Meses"
          className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
        >
          {MONTH_INITIALS.map((initial, index) => (
            <button
              key={MONTH_NAMES[index]}
              type="button"
              role="checkbox"
              aria-checked={enabledMonths[index]}
              aria-label={MONTH_NAMES[index]}
              title={MONTH_NAMES[index]}
              onClick={() => onToggleMonth(index)}
              className={`type-chip flex h-9 cursor-pointer flex-col items-center justify-center rounded-md border tracking-normal transition-[color,background-color,border-color] duration-200 ease-standard ${enabledMonths[index] ? "border-selected bg-selected font-semibold text-ink-inverse hover:border-selected-hover hover:bg-selected-hover" : "border-line bg-surface-ground/60 text-ink-disabled line-through hover:border-line-strong hover:text-ink-muted"}`}
            >
              <span className="sm:hidden">
                {MONTH_NAMES[index].slice(0, 3)}
              </span>
              <span className="hidden sm:inline">{initial}</span>
            </button>
          ))}
        </div>
      </Field>
      {notice && (
        <p className="type-body-sm flex items-start gap-2 rounded-md border border-status-stale/30 bg-status-stale/10 px-3 py-2.5 text-ink">
          <MaterialSymbol
            name="schedule"
            className="mt-0.5 size-[18px] shrink-0 text-status-stale"
          />
          {notice}
        </p>
      )}
      <p className="type-body-sm flex items-center gap-2 border-t border-line pt-4 text-ink-muted tabular-nums">
        <MaterialSymbol name="straighten" className="size-[18px] shrink-0" />
        {unitLine}
      </p>
    </section>
  );
}
