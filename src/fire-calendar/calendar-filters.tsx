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

const SELECT_CLASS_NAME =
  "type-chip h-8 cursor-pointer appearance-none rounded-sm border border-line-strong bg-surface text-ink transition-colors duration-120 ease-standard hover:border-line-strong hover:bg-surface-hover";

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
      className={`${SELECT_CLASS_NAME} w-[4.75rem] px-2.5`}
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
}) {
  return (
    <section
      aria-label="Filtros do calendário"
      className="flex flex-col gap-4 rounded-md border border-line bg-surface px-5 py-4"
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <Field label="Região">
          <span className="relative inline-flex w-52 items-center">
            <MaterialSymbol
              name="location_on"
              className="pointer-events-none absolute left-2.5 size-[18px]"
            />
            <select
              aria-label="Região"
              value={area}
              disabled={areaOptions.length === 0}
              onChange={(event) => onAreaChange(event.target.value)}
              className={`${SELECT_CLASS_NAME} w-full pr-8 pl-8 disabled:cursor-not-allowed`}
            >
              {areaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <MaterialSymbol
              name="keyboard_arrow_down"
              className="pointer-events-none absolute right-2 size-[18px]"
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
        <Field label="Meses">
          <div role="group" aria-label="Meses" className="flex flex-wrap gap-1">
            {MONTH_INITIALS.map((initial, index) => (
              <button
                key={MONTH_NAMES[index]}
                type="button"
                role="checkbox"
                aria-checked={enabledMonths[index]}
                aria-label={MONTH_NAMES[index]}
                onClick={() => onToggleMonth(index)}
                className={`type-chip size-8 cursor-pointer rounded-sm border tracking-normal transition-colors duration-120 ease-standard ${enabledMonths[index] ? "border-selected bg-selected font-semibold text-ink-inverse hover:border-selected-hover hover:bg-selected-hover" : "border-line-strong bg-surface text-ink hover:bg-surface-hover"}`}
              >
                {initial}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex gap-2 lg:ml-auto">
          <button
            type="button"
            onClick={onClear}
            className="type-button h-8 cursor-pointer rounded-sm border border-transparent px-3 text-ink transition-colors duration-120 ease-standard hover:bg-surface-hover"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={onDownload ?? undefined}
            disabled={!onDownload}
            className="type-button inline-flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-line-strong bg-surface-raised px-3 text-ink transition-colors duration-120 ease-standard hover:border-ink disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:border-line-strong"
          >
            <MaterialSymbol name="download" className="size-[18px]" />
            Baixar
          </button>
        </div>
      </div>
      {notice && (
        <p className="type-body-sm flex items-start gap-2 text-ink">
          <MaterialSymbol
            name="schedule"
            className="mt-0.5 size-[18px] shrink-0 text-status-stale"
          />
          {notice}
        </p>
      )}
      <p className="type-body-sm flex items-center gap-2 border-t border-line pt-3 text-ink-muted tabular-nums">
        <MaterialSymbol name="straighten" className="size-[18px] shrink-0" />
        {unitLine}
      </p>
    </section>
  );
}
