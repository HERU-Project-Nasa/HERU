"use client";

import { m, useInView, useReducedMotion } from "motion/react";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { HEAT_BACKGROUNDS } from "@/fire-calendar/calendar-cell-style";
import {
  formatCount,
  MONTH_ABBREVIATIONS,
  yearsLabel,
} from "@/fire-calendar/calendar-labels";
import { heatLevel } from "@/fire-calendar/calendar-statistics";
import type { YearValue } from "@/fire-calendar/month-comparison";
import { EASE_STANDARD } from "@/motion/chart-motion";

const SHARE_BAR_HEIGHT = 120;
const SMALL_SHARE = 2;
const PERCENT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const SMALL_PERCENT = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const DEFAULT_WIDTH = 576;
const MIN_WIDTH = 280;
const YEAR_LABEL_WIDTH = 34;
const VALUE_LABEL_HALF = 24;
const HEIGHT = 200;
const PLOT_TOP = 24;
const PLOT_BOTTOM = 172;
const LABEL_Y = 192;

export function shareLabel(fraction: number): string {
  const percent = fraction * 100;
  return `${(percent < SMALL_SHARE ? SMALL_PERCENT : PERCENT).format(percent)}%`;
}

/** Draws the chart at the container's real width, so labels keep their size on a phone. */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(MIN_WIDTH, Math.round(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** Shared timing so bars, lines and labels land in the same order in every chart. */
function useChartTiming(count: number) {
  const reduced = Boolean(useReducedMotion());
  const stagger = Math.min(0.035, 0.6 / Math.max(1, count));
  const bar = (index: number) => ({
    duration: reduced ? 0 : 0.5,
    delay: reduced ? 0 : 0.15 + index * stagger,
    ease: EASE_STANDARD,
  });
  const settled = reduced ? 0 : 0.15 + count * stagger + 0.35;
  return { reduced, bar, settled };
}

function Legend({ children }: { children: ReactNode }) {
  return (
    <ul className="type-body-sm mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-ink-muted">
      {children}
    </ul>
  );
}

function LegendItem({
  swatch,
  children,
}: {
  swatch: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="inline-flex w-5 justify-center">
        {swatch}
      </span>
      {children}
    </li>
  );
}

function seasonRuns(months: number[]): number[][] {
  const sorted = [...months].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const month of sorted) {
    const run = runs.at(-1);
    if (run && run.at(-1) === month - 1) {
      run.push(month);
    } else {
      runs.push([month]);
    }
  }
  return runs;
}

export function MonthShareBars({
  values,
  season,
  breaks,
  label,
  compare,
}: {
  values: number[];
  season: number[];
  breaks: number[];
  label: string;
  compare: { label: string; shares: (number | null)[] } | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const { reduced, bar, settled } = useChartTiming(12);
  const total = values.reduce((sum, value) => sum + value, 0);
  const shares = values.map((value) => (total > 0 ? value / total : 0));
  const largest = Math.max(
    ...shares,
    ...(compare?.shares ?? []).flatMap((share) =>
      share === null ? [] : [share],
    ),
  );
  const height = (share: number) =>
    largest ? Math.max(2, Math.round((share / largest) * SHARE_BAR_HEIGHT)) : 2;
  const seasonShare = season.reduce((sum, month) => sum + shares[month], 0);
  const runs = seasonRuns(season);
  const longest = runs.reduce((best, run) =>
    run.length > best.length ? run : best,
  );
  return (
    <figure ref={ref} className="m-0">
      <div role="img" aria-label={label}>
        <div className="grid grid-cols-12 gap-x-1.5" aria-hidden="true">
          {runs.map((run) => (
            <m.div
              key={run[0]}
              className="mb-2 flex flex-col items-center gap-1"
              style={{ gridColumn: `${run[0] + 1} / ${run.at(-1)! + 2}` }}
              initial={{ opacity: 0, y: 6 }}
              animate={inView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: reduced ? 0 : 0.4, delay: settled }}
            >
              {run === longest && (
                <span className="type-data whitespace-nowrap text-ink">
                  {shareLabel(seasonShare)} juntos
                </span>
              )}
              <span className="mt-auto block h-2 w-full rounded-t-[2px] border border-b-0 border-ink" />
            </m.div>
          ))}
        </div>
        <div
          className="grid grid-cols-12 items-end gap-x-1.5 border-b border-line"
          aria-hidden="true"
        >
          {shares.map((share, month) => {
            const compared = compare?.shares[month] ?? null;
            return (
              <div
                key={MONTH_ABBREVIATIONS[month]}
                className="relative flex h-[148px] flex-col items-center justify-end"
              >
                <m.span
                  className={`absolute text-xs leading-4 font-semibold tabular-nums ${season.includes(month) ? "text-ink" : "text-ink-muted"}`}
                  style={{ bottom: height(share) + 6 }}
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : undefined}
                  transition={{ duration: 0.3, delay: bar(month).delay + 0.35 }}
                >
                  {shareLabel(share)}
                </m.span>
                <m.span
                  className={`block w-full origin-bottom rounded-t-[2px] ${HEAT_BACKGROUNDS[heatLevel(values[month], breaks) - 1]}`}
                  style={{ height: height(share) }}
                  initial={{ scaleY: 0 }}
                  animate={inView ? { scaleY: 1 } : undefined}
                  transition={bar(month)}
                />
                {compared !== null && (
                  <m.span
                    className="absolute -inset-x-0.5 h-0.5 rounded-full bg-ink shadow-[0_0_0_1px_var(--color-surface)]"
                    initial={{ opacity: 0, bottom: height(share) }}
                    animate={
                      inView
                        ? { opacity: 1, bottom: height(compared) - 1 }
                        : undefined
                    }
                    transition={{
                      duration: reduced ? 0 : 0.5,
                      delay: settled + month * 0.03,
                      ease: EASE_STANDARD,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-12 gap-x-1.5" aria-hidden="true">
          {MONTH_ABBREVIATIONS.map((month) => (
            <span
              key={month}
              className="type-chip text-center text-xs tracking-[0.1em] text-ink-muted uppercase"
            >
              {month}
            </span>
          ))}
        </div>
      </div>
      <Legend>
        <LegendItem
          swatch={<span className="h-3 w-2.5 rounded-t-[2px] bg-heat-3" />}
        >
          Ano típico: parte de cada mês nos focos do ano
        </LegendItem>
        {compare && (
          <LegendItem
            swatch={<span className="h-0.5 w-4 rounded-full bg-ink" />}
          >
            {compare.label}
          </LegendItem>
        )}
        <LegendItem
          swatch={
            <span className="h-2 w-4 rounded-t-[2px] border border-b-0 border-ink" />
          }
        >
          Temporada crítica
        </LegendItem>
      </Legend>
    </figure>
  );
}

export function YearBars({
  points,
  highlight,
  highlightLabel,
  typical,
  band,
  label,
  valueLabel,
  labelEveryBar,
}: {
  points: YearValue[];
  highlight: number | null;
  highlightLabel: string;
  typical: number | null;
  band: [number, number] | null;
  label: string;
  valueLabel: (value: number) => string;
  labelEveryBar: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const { reduced, bar, settled } = useChartTiming(points.length);
  const [hovered, setHovered] = useState<number | null>(null);
  const width = useWidth(ref);
  const values = points.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  const top = Math.max(1, ...values, typical ?? 0, band?.[1] ?? 0) * 1.1;
  const step = width / points.length;
  const barWidth = Math.max(2, step * 0.68);
  const y = (value: number) =>
    PLOT_BOTTOM - (value / top) * (PLOT_BOTTOM - PLOT_TOP);
  const first = points[0]?.year;
  const last = points.at(-1)?.year;
  const hoveredYear = hovered === null ? null : points[hovered]?.year;
  const labelGap = Math.max(2, Math.ceil(YEAR_LABEL_WIDTH / step));
  const shownYear = (year: number) =>
    year === highlight ||
    year === first ||
    year === last ||
    (year % 5 === 0 &&
      (highlight === null || Math.abs(year - highlight) >= labelGap) &&
      year - first! >= labelGap &&
      last! - year >= labelGap);
  const valueAnchor = (center: number) =>
    center > width - VALUE_LABEL_HALF
      ? { x: width, textAnchor: "end" as const }
      : center < VALUE_LABEL_HALF
        ? { x: 0, textAnchor: "start" as const }
        : { x: center, textAnchor: "middle" as const };
  const fadeIn = (delay: number) => ({
    initial: { opacity: 0 },
    animate: inView ? { opacity: 1 } : undefined,
    transition: { duration: reduced ? 0 : 0.35, delay },
  });

  return (
    <figure ref={ref} className="m-0">
      <div role="img" aria-label={label}>
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block w-full touch-pan-y font-ui"
          aria-hidden="true"
          onPointerLeave={() => setHovered(null)}
        >
          {band && (
            <m.rect
              x="0"
              y={y(band[1])}
              width={width}
              height={Math.max(1, y(band[0]) - y(band[1]))}
              className="fill-ink/16"
              {...fadeIn(0)}
            />
          )}
          {points.map((point, index) => {
            if (point.value === null) {
              return null;
            }
            const x = index * step + (step - barWidth) / 2;
            const height = Math.max(1, PLOT_BOTTOM - y(point.value));
            const highlighted = point.year === highlight;
            const active = index === hovered;
            const labelled =
              highlighted || active || (labelEveryBar && point.value > 0);
            return (
              <g key={point.year}>
                <m.rect
                  x={x}
                  width={barWidth}
                  rx="1.5"
                  initial={{ y: PLOT_BOTTOM, height: 0 }}
                  animate={
                    inView ? { y: PLOT_BOTTOM - height, height } : undefined
                  }
                  transition={bar(index)}
                  className={`transition-[fill] duration-150 ${highlighted ? "fill-data-burned" : active ? "fill-ink-muted" : "fill-line-strong"}`}
                />
                {labelled && (
                  <m.text
                    {...valueAnchor(x + barWidth / 2)}
                    y={PLOT_BOTTOM - height - 6}
                    fontSize="12"
                    fontWeight="600"
                    className={
                      highlighted || active ? "fill-ink" : "fill-ink-muted"
                    }
                    {...(active && !highlighted && !labelEveryBar
                      ? {}
                      : fadeIn(
                          highlighted ? settled : bar(index).delay + 0.35,
                        ))}
                  >
                    {valueLabel(point.value)}
                  </m.text>
                )}
              </g>
            );
          })}
          {typical !== null && (
            <g>
              <m.line
                x1="0"
                x2={width}
                y1={y(typical)}
                y2={y(typical)}
                strokeDasharray="4 4"
                className="stroke-ink-muted"
                style={{ originX: 0 }}
                initial={{ scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : undefined}
                transition={{
                  duration: reduced ? 0 : 0.6,
                  delay: settled - 0.2,
                  ease: EASE_STANDARD,
                }}
              />
              <m.text
                x="2"
                y={y(typical) - 6}
                fontSize="11"
                className="fill-ink-muted"
                {...fadeIn(settled)}
              >
                típico
              </m.text>
            </g>
          )}
          <line
            x1="0"
            x2={width}
            y1={PLOT_BOTTOM}
            y2={PLOT_BOTTOM}
            className="stroke-line"
          />
          {points.map((point, index) =>
            shownYear(point.year) && point.year !== hoveredYear ? (
              <text
                key={point.year}
                x={
                  index === 0
                    ? 0
                    : index === points.length - 1
                      ? width
                      : index * step + step / 2
                }
                y={LABEL_Y}
                fontSize="11"
                textAnchor={
                  index === 0
                    ? "start"
                    : index === points.length - 1
                      ? "end"
                      : "middle"
                }
                className={
                  point.year === highlight ? "fill-ink" : "fill-ink-muted"
                }
              >
                {point.year}
              </text>
            ) : null,
          )}
          {hovered !== null && hoveredYear !== undefined && (
            <g pointerEvents="none">
              <rect
                x={Math.min(
                  width - 40,
                  Math.max(0, hovered * step + step / 2 - 20),
                )}
                y={LABEL_Y - 12}
                width={40}
                height={16}
                rx={3}
                className="fill-surface-raised"
              />
              <text
                x={Math.min(
                  width - 20,
                  Math.max(20, hovered * step + step / 2),
                )}
                y={LABEL_Y}
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                className="fill-ink"
              >
                {hoveredYear}
              </text>
            </g>
          )}
          {points.map((point, index) => (
            <rect
              key={point.year}
              x={index * step}
              y={0}
              width={step}
              height={HEIGHT}
              fill="transparent"
              onPointerEnter={() => setHovered(index)}
              onPointerDown={() => setHovered(index)}
            />
          ))}
        </svg>
      </div>
      <Legend>
        <LegendItem
          swatch={<span className="size-2.5 rounded-xs bg-data-burned" />}
        >
          {highlightLabel}
        </LegendItem>
        {typical !== null && (
          <LegendItem
            swatch={
              <span className="w-5 border-t border-dashed border-ink-muted" />
            }
          >
            Típico: mediana dos anos
          </LegendItem>
        )}
        {band && (
          <LegendItem
            swatch={<span className="h-3 w-5 rounded-xs bg-ink/22" />}
          >
            Faixa usual: entre 25% e 75% dos anos
          </LegendItem>
        )}
        <li className="text-ink-disabled max-sm:hidden sm:ml-auto">
          Passe o mouse nas barras
        </li>
      </Legend>
    </figure>
  );
}

export type Verdict = "above" | "inside" | "below";

export function bandVerdict(
  value: number,
  band: [number, number] | null,
): Verdict | null {
  if (!band) return null;
  return value > band[1] ? "above" : value < band[0] ? "below" : "inside";
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  above: "Acima da faixa usual",
  inside: "Dentro da faixa usual",
  below: "Abaixo da faixa usual",
};

/**
 * Every year as a dot on one axis, so the reader sees at once where the chosen
 * year sits among all the others and against the usual band.
 */
export function RangeGauge({
  history,
  highlight,
  highlightLabel,
  typical,
  band,
}: {
  history: YearValue[];
  highlight: number;
  highlightLabel: string;
  typical: number;
  band: [number, number] | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = Boolean(useReducedMotion());
  const measured = history.flatMap((point) =>
    point.value === null ? [] : [{ year: point.year, value: point.value }],
  );
  const current = measured.find((point) => point.year === highlight);
  if (!current || measured.length < 3) {
    return null;
  }
  const minimum = Math.min(...measured.map((point) => point.value));
  const maximum = Math.max(...measured.map((point) => point.value));
  const position = (value: number) =>
    maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum);
  const percent = (value: number) => `${position(value) * 100}%`;
  const others = measured.filter((point) => point.year !== highlight);
  const settle = reduced ? 0 : 0.5;

  return (
    <figure
      ref={ref}
      className="m-0 flex flex-col gap-2 rounded-md bg-surface-hover px-5 pt-4 pb-3"
    >
      <figcaption className="type-eyebrow text-ink-muted">
        Onde {highlightLabel} fica entre {yearsLabel(measured.length)}
      </figcaption>
      <div aria-hidden="true" className="relative mx-1.5 h-[68px]">
        <span className="absolute inset-x-0 top-[33px] h-0.5 rounded-full bg-line" />
        {band && (
          <m.span
            className="absolute top-[26px] h-4 origin-left rounded-sm bg-ink/22 ring-1 ring-ink/30"
            style={{
              left: percent(band[0]),
              width: `${(position(band[1]) - position(band[0])) * 100}%`,
            }}
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : undefined}
            transition={{ duration: reduced ? 0 : 0.5, ease: EASE_STANDARD }}
          />
        )}
        {others.map((point, index) => (
          <m.span
            key={point.year}
            className="absolute top-[30px] size-2 -translate-x-1/2 rounded-full bg-ink-muted/70"
            style={{ left: percent(point.value) }}
            initial={{ opacity: 0, scale: 0 }}
            animate={inView ? { opacity: 1, scale: 1 } : undefined}
            transition={{
              duration: reduced ? 0 : 0.25,
              delay: reduced ? 0 : 0.2 + index * 0.025,
            }}
          />
        ))}
        <m.span
          className="absolute top-[8px] flex w-0 flex-col items-center gap-0.5"
          style={{ left: percent(typical) }}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : undefined}
          transition={{ duration: 0.3, delay: settle }}
        >
          <span
            className="type-caption self-start text-[10px] whitespace-nowrap text-ink-muted"
            style={{ transform: `translateX(-${position(typical) * 100}%)` }}
          >
            típico {formatCount(typical)}
          </span>
          <span className="h-6 border-l border-dashed border-ink" />
        </m.span>
        <m.span
          className="absolute top-[27px] flex w-0 flex-col items-center gap-1"
          initial={{ left: percent(typical), opacity: 0 }}
          animate={
            inView ? { left: percent(current.value), opacity: 1 } : undefined
          }
          transition={{
            duration: reduced ? 0 : 0.8,
            delay: settle + 0.2,
            ease: EASE_STANDARD,
          }}
        >
          <span className="size-3.5 shrink-0 rounded-full bg-data-burned shadow-[0_0_0_4px_rgba(240,61,61,0.25)]" />
          <span
            className="type-data self-start text-xs whitespace-nowrap text-ink"
            style={{
              transform: `translateX(-${position(current.value) * 100}%)`,
            }}
          >
            {highlightLabel}: {formatCount(current.value)}
          </span>
        </m.span>
      </div>
      <div className="type-caption flex justify-between gap-3 text-[10px] text-ink-muted tabular-nums">
        <span>Menor: {formatCount(minimum)}</span>
        {band && (
          <span className="text-center">
            Faixa usual: {formatCount(band[0])} a {formatCount(band[1])}
          </span>
        )}
        <span>Maior: {formatCount(maximum)}</span>
      </div>
    </figure>
  );
}

/** A short ranked list of months, each with a bar for how many times its typical value it reached. */
export function RatioList({
  rows,
}: {
  rows: { key: string; label: string; value: number; ratio: number | null }[];
}) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = Boolean(useReducedMotion());
  const largest = Math.max(1, ...rows.map((row) => row.ratio ?? 0));
  return (
    <ul ref={ref} className="flex flex-col gap-2.5">
      {rows.map((row, index) => (
        <li
          key={row.key}
          className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center gap-3"
        >
          <span className="type-body-sm truncate text-ink first-letter:uppercase">
            {row.label}
          </span>
          <span className="relative h-2 rounded-full bg-line">
            {row.ratio !== null && (
              <m.span
                className="absolute inset-y-0 left-0 origin-left rounded-full bg-data-burned"
                style={{ width: `${(row.ratio / largest) * 100}%` }}
                initial={{ scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : undefined}
                transition={{
                  duration: reduced ? 0 : 0.6,
                  delay: reduced ? 0 : 0.1 + index * 0.08,
                  ease: EASE_STANDARD,
                }}
              />
            )}
            <span
              className="absolute -inset-y-1 w-px bg-ink"
              style={{ left: `${(1 / largest) * 100}%` }}
              title="típico"
            />
          </span>
          <span className="type-data text-right text-xs whitespace-nowrap text-ink tabular-nums">
            {formatCount(row.value)}
            {row.ratio !== null && (
              <span className="text-ink-muted">
                {" "}
                ·{" "}
                {row.ratio.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}
                ×
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
