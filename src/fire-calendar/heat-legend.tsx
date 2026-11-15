import type { CSSProperties, ReactNode } from "react";
import { MaterialSymbol } from "@/icons/material-symbols";
import {
  HATCH,
  HEAT_BACKGROUNDS,
  LIGHT_HATCH,
  OUTLIER_RING,
  PARTIAL_STRIPES,
} from "./calendar-cell-style";
import { heatRangeLabel } from "./calendar-labels";
import type { CellState } from "./calendar-matrix";

function Mark({
  className,
  style,
  children,
  label,
}: {
  className: string;
  style?: CSSProperties;
  children?: ReactNode;
  label: string;
}) {
  return (
    <li className="type-body-sm flex items-center gap-2 text-ink">
      <span
        aria-hidden="true"
        className={`relative flex h-4 w-7 items-center justify-center rounded-xs ${className}`}
        style={style}
      >
        {children}
      </span>
      {label}
    </li>
  );
}

export function HeatLegend({
  breaks,
  states,
}: {
  breaks: number[];
  states: Set<CellState>;
}) {
  const levels =
    breaks.length === 0
      ? states.has("value")
        ? [{ level: 4, label: heatRangeLabel(null, null) }]
        : []
      : HEAT_BACKGROUNDS.map((_, index) => ({
          level: index + 1,
          label: heatRangeLabel(
            index === 0 ? null : breaks[index - 1],
            index === 5 ? null : breaks[index],
          ),
        }));

  return (
    <div className="mt-6 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-6">
      <div className="flex flex-col gap-2">
        <span className="type-caption text-ink-muted">Focos por mês</span>
        <div className="grid grid-cols-4 gap-x-1 gap-y-3 sm:min-w-[420px] sm:grid-cols-7">
          {[{ level: 0, label: "0" }, ...levels].map(({ level, label }) => (
            <span key={level} className="flex min-w-0 flex-col gap-1.5">
              <span
                aria-hidden="true"
                className={`block h-3 w-full rounded-xs ${level === 0 ? "border border-line bg-heat-0" : HEAT_BACKGROUNDS[level - 1]}`}
              />
              <span className="text-xs leading-4 whitespace-nowrap text-ink-muted tabular-nums">
                {label}
              </span>
            </span>
          ))}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2.5">
        <Mark
          label="Fora do padrão"
          className={HEAT_BACKGROUNDS[4]}
          style={{ boxShadow: OUTLIER_RING }}
        >
          <span className="absolute top-0.5 right-0.5 size-1 rounded-full bg-ink shadow-[0_0_0_1px_var(--color-surface-ground)]" />
        </Mark>
        <Mark
          label="Mês parcial"
          className={HEAT_BACKGROUNDS[3]}
          style={{ backgroundImage: PARTIAL_STRIPES }}
        />
        <Mark
          label="Sem dados"
          className="border border-line"
          style={{ backgroundImage: HATCH }}
        />
        {states.has("computing") && (
          <Mark
            label="Em cálculo"
            className="border border-line"
            style={{ backgroundImage: HATCH }}
          >
            <MaterialSymbol name="schedule" className="size-3 text-ink-muted" />
          </Mark>
        )}
        {states.has("loading") && (
          <Mark
            label="Carregando"
            className="border border-line text-[10px] leading-none text-ink-muted"
            style={{ backgroundImage: LIGHT_HATCH }}
          >
            ...
          </Mark>
        )}
        <li className="type-body-sm flex items-center gap-2 text-ink">
          <span aria-hidden="true" className="inline-flex gap-[3px]">
            <span className="h-4 w-1 rounded-[1px] bg-modis" />
            <span className="h-4 w-1 rounded-[1px] bg-viirs" />
          </span>
          Sensor: MODIS · VIIRS
        </li>
      </ul>
    </div>
  );
}
