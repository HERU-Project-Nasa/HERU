import { HEAT_BACKGROUNDS } from "@/fire-calendar/calendar-cell-style";
import { MONTH_ABBREVIATIONS } from "@/fire-calendar/calendar-labels";
import { heatLevel } from "@/fire-calendar/calendar-statistics";
import type { YearValue } from "@/fire-calendar/month-comparison";

const SHARE_BAR_HEIGHT = 120;
const SMALL_SHARE = 2;
const PERCENT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const SMALL_PERCENT = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const WIDTH = 576;
const HEIGHT = 200;
const PLOT_TOP = 24;
const PLOT_BOTTOM = 172;
const LABEL_Y = 192;

export function shareLabel(fraction: number): string {
  const percent = fraction * 100;
  return `${(percent < SMALL_SHARE ? SMALL_PERCENT : PERCENT).format(percent)}%`;
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
}: {
  values: number[];
  season: number[];
  breaks: number[];
  label: string;
}) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const shares = values.map((value) => (total > 0 ? value / total : 0));
  const largest = Math.max(...shares);
  const seasonShare = season.reduce((sum, month) => sum + shares[month], 0);
  const runs = seasonRuns(season);
  const longest = runs.reduce((best, run) =>
    run.length > best.length ? run : best,
  );
  return (
    <figure role="img" aria-label={label} className="m-0">
      <div className="grid grid-cols-12 gap-x-1.5" aria-hidden="true">
        {runs.map((run) => (
          <div
            key={run[0]}
            className="mb-2 flex flex-col items-center gap-1"
            style={{ gridColumn: `${run[0] + 1} / ${run.at(-1)! + 2}` }}
          >
            {run === longest && (
              <span className="type-data whitespace-nowrap text-ink">
                {shareLabel(seasonShare)} juntos
              </span>
            )}
            <span className="mt-auto block h-2 w-full rounded-t-[2px] border border-b-0 border-ink" />
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-12 items-end gap-x-1.5 border-b border-line"
        aria-hidden="true"
      >
        {shares.map((share, month) => (
          <div
            key={MONTH_ABBREVIATIONS[month]}
            className="flex h-[148px] flex-col items-center justify-end gap-1.5"
          >
            <span
              className={`text-xs leading-4 font-semibold tabular-nums ${season.includes(month) ? "text-ink" : "text-ink-muted"}`}
            >
              {shareLabel(share)}
            </span>
            <span
              className={`block w-full rounded-t-[2px] ${HEAT_BACKGROUNDS[heatLevel(values[month], breaks) - 1]}`}
              style={{
                height: largest
                  ? Math.max(
                      2,
                      Math.round((share / largest) * SHARE_BAR_HEIGHT),
                    )
                  : 2,
              }}
            />
          </div>
        ))}
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
    </figure>
  );
}

export function YearBars({
  points,
  highlight,
  typical,
  band,
  label,
  valueLabel,
  labelEveryBar,
}: {
  points: YearValue[];
  highlight: number | null;
  typical: number | null;
  band: [number, number] | null;
  label: string;
  valueLabel: (value: number) => string;
  labelEveryBar: boolean;
}) {
  const values = points.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  const top = Math.max(1, ...values, typical ?? 0, band?.[1] ?? 0) * 1.1;
  const step = WIDTH / points.length;
  const barWidth = Math.max(2, step * 0.68);
  const y = (value: number) =>
    PLOT_BOTTOM - (value / top) * (PLOT_BOTTOM - PLOT_TOP);
  const first = points[0]?.year;
  const last = points.at(-1)?.year;
  const shownYear = (year: number) =>
    year === highlight ||
    year === first ||
    year === last ||
    (year % 5 === 0 &&
      (highlight === null || Math.abs(year - highlight) > 1) &&
      year - first! > 1 &&
      last! - year > 1);

  return (
    <figure role="img" aria-label={label} className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block w-full font-ui"
        aria-hidden="true"
      >
        {band && (
          <rect
            x="0"
            y={y(band[1])}
            width={WIDTH}
            height={Math.max(1, y(band[0]) - y(band[1]))}
            className="fill-ink/8"
          />
        )}
        {points.map((point, index) => {
          if (point.value === null) {
            return null;
          }
          const x = index * step + (step - barWidth) / 2;
          const height = Math.max(1, PLOT_BOTTOM - y(point.value));
          const highlighted = point.year === highlight;
          return (
            <g key={point.year}>
              <rect
                x={x}
                y={PLOT_BOTTOM - height}
                width={barWidth}
                height={height}
                rx="1.5"
                className={
                  highlighted ? "fill-data-burned" : "fill-line-strong"
                }
              />
              {(highlighted || (labelEveryBar && point.value > 0)) && (
                <text
                  x={x + barWidth / 2}
                  y={PLOT_BOTTOM - height - 6}
                  fontSize="12"
                  fontWeight="600"
                  textAnchor="middle"
                  className={highlighted ? "fill-ink" : "fill-ink-muted"}
                >
                  {valueLabel(point.value)}
                </text>
              )}
            </g>
          );
        })}
        {typical !== null && (
          <g>
            <line
              x1="0"
              x2={WIDTH}
              y1={y(typical)}
              y2={y(typical)}
              strokeDasharray="4 4"
              className="stroke-ink-muted"
            />
            <text
              x="2"
              y={y(typical) - 6}
              fontSize="11"
              className="fill-ink-muted"
            >
              típico
            </text>
          </g>
        )}
        <line
          x1="0"
          x2={WIDTH}
          y1={PLOT_BOTTOM}
          y2={PLOT_BOTTOM}
          className="stroke-line"
        />
        {points.map((point, index) =>
          shownYear(point.year) ? (
            <text
              key={point.year}
              x={
                index === 0
                  ? 0
                  : index === points.length - 1
                    ? WIDTH
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
      </svg>
    </figure>
  );
}
