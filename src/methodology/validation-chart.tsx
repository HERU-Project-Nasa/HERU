"use client";

import { useRef } from "react";
import {
  formatCompact,
  formatCount,
  MONTH_ABBREVIATIONS,
} from "@/fire-calendar/calendar-labels";
import { useTr } from "@/i18n/locale";
import { MaterialSymbol } from "@/icons/material-symbols";
import { type CountryRow, countryName } from "@/pipeline/pipeline-countries";
import { usePipelineFile } from "@/pipeline/pipeline-files";
import { WORLD_AREA } from "@/pipeline/series-row";
import { niceStep } from "./before-after-chart";
import { useMethodologyArea } from "./methodology-figures";
import {
  ChartHover,
  FadeInSvg,
  RevealClip,
  useChartReveal,
} from "@/motion/chart-motion";

type ValidationMonthRow = {
  scope: string;
  id: string;
  month: string;
  viirs_snpp: number | null;
  modis: number | null;
  modis_x_k: number | null;
};

const VALIDATION_MONTHLY_PATH = "meta/validation_monthly.csv";

const LEFT = 64;
const RIGHT = 730;
const TOP = 24;
const BOTTOM = 252;

function polyline(
  values: (number | null)[],
  x: (index: number) => number,
  y: (value: number) => number,
): string {
  return values
    .flatMap((value, index) =>
      value === null ? [] : [`${x(index).toFixed(1)},${y(value).toFixed(1)}`],
    )
    .join(" ");
}

function gapArea(
  observed: (number | null)[],
  rebuilt: (number | null)[],
  x: (index: number) => number,
  y: (value: number) => number,
): string | null {
  if (observed.some((value) => value === null)) return null;
  if (rebuilt.some((value) => value === null)) return null;
  const forward = observed.map(
    (value, index) => `${x(index).toFixed(1)},${y(value!).toFixed(1)}`,
  );
  const back = rebuilt
    .map((value, index) => `${x(index).toFixed(1)},${y(value!).toFixed(1)}`)
    .reverse();
  return [...forward, ...back].join(" ");
}

function monthLabel(month: string): string {
  return `${MONTH_ABBREVIATIONS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;
}

export function ValidationChart() {
  const t = useTr();
  const [area] = useMethodologyArea();
  const figureRef = useRef<HTMLElement>(null);
  const reveal = useChartReveal(figureRef);
  const file = usePipelineFile<ValidationMonthRow>(VALIDATION_MONTHLY_PATH);
  const countries = usePipelineFile<CountryRow>("meta/countries.csv").rows;
  const country = countries?.find((candidate) => candidate.iso3 === area);
  const areaName =
    area === WORLD_AREA
      ? t("World", "Mundo")
      : country
        ? countryName(country)
        : "";

  if (!file.rows) {
    return file.error ? null : (
      <figure
        ref={figureRef}
        className="h-[340px] animate-pulse rounded-md border border-line bg-surface"
      />
    );
  }
  const rows = file.rows
    .filter((row) =>
      area === WORLD_AREA
        ? row.scope === "world"
        : row.scope === "country" && row.id === area,
    )
    .sort((a, b) => a.month.localeCompare(b.month));
  if (rows.length === 0) {
    return (
      <p className="type-body-sm flex items-start gap-2 text-ink-muted">
        <MaterialSymbol name="info" className="mt-0.5 size-4 shrink-0" />
        {t(
          "The pipeline has not published the month-by-month validation for this region.",
          "A pipeline não publicou a validação mês a mês desta região.",
        )}
      </p>
    );
  }

  const observed = rows.map((row) => row.viirs_snpp);
  const rebuilt = rows.map((row) => row.modis_x_k);
  const largest = Math.max(
    1,
    ...[...observed, ...rebuilt].flatMap((value) =>
      value === null ? [] : [value],
    ),
  );
  const step = niceStep(largest);
  const top = Math.ceil(largest / step) * step;
  const x = (index: number) =>
    LEFT + (index / Math.max(1, rows.length - 1)) * (RIGHT - LEFT);
  const y = (value: number) => BOTTOM - (value / top) * (BOTTOM - TOP);
  const ticks = Array.from(
    { length: Math.round(top / step) + 1 },
    (_, index) => index * step,
  );
  const gap = gapArea(observed, rebuilt, x, y);
  const first = rows[0].month;
  const last = rows.at(-1)!.month;
  const lines = [
    {
      values: observed,
      label: t("S-NPP observed", "S-NPP observado"),
      className: "stroke-ink",
      swatch: "fill-ink",
      width: 2.5,
      dash: undefined,
      text: "fill-ink",
    },
    {
      values: rebuilt,
      label: "MODIS × k",
      className: "stroke-delta-above",
      swatch: "fill-delta-above",
      width: 2,
      dash: "6 5",
      text: "fill-delta-above",
    },
  ];

  return (
    <figure
      ref={figureRef}
      className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4 sm:p-6"
    >
      <figcaption className="flex flex-col gap-1">
        <span className="type-heading-sm text-ink">
          {t(
            `Observed and reconstructed · ${areaName}`,
            `Observado e reconstruído · ${areaName}`,
          )}
        </span>
        <span className="type-body-sm text-ink-muted">
          {t(
            `Hotspots per month, ${monthLabel(first)} to ${monthLabel(last)}. The dashed line is what MODIS × k would say; the solid line is what S-NPP saw. The band between them is the error.`,
            `Focos por mês, de ${monthLabel(first)} a ${monthLabel(last)}. A linha tracejada é o que o MODIS × k diria; a contínua, o que o S-NPP viu. A faixa entre elas é o erro.`,
          )}
        </span>
      </figcaption>
      <div className="relative overflow-x-auto">
        <svg
          viewBox="0 0 840 290"
          role="img"
          aria-label={t(
            `Hotspots per month in ${areaName}, ${monthLabel(first)} to ${monthLabel(last)}: S-NPP as observed and as reconstructed from MODIS times k.`,
            `Focos por mês em ${areaName}, de ${first} a ${last}: o S-NPP observado e o reconstruído a partir do MODIS vezes k.`,
          )}
          className="block w-full min-w-[640px] touch-pan-y font-ui"
        >
          <defs>
            <RevealClip
              id={reveal.clipId}
              x={0}
              y={0}
              width={840}
              height={290}
              shown={reveal.shown}
              reduced={reveal.reduced}
              replayKey={area}
            />
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={LEFT}
                x2={RIGHT}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-line"
              />
              <text
                x={LEFT - 10}
                y={y(tick) + 4}
                fontSize="12"
                textAnchor="end"
                className="fill-ink-muted"
              >
                {formatCompact(tick)}
              </text>
            </g>
          ))}
          {rows.map((row, index) =>
            row.month.endsWith("-01") ? (
              <g key={row.month}>
                <line
                  x1={x(index)}
                  x2={x(index)}
                  y1={BOTTOM}
                  y2={BOTTOM + 6}
                  className="stroke-line-strong"
                />
                <text
                  x={x(index)}
                  y={BOTTOM + 24}
                  fontSize="12"
                  textAnchor="middle"
                  className="fill-ink-muted"
                >
                  {row.month.slice(0, 4)}
                </text>
              </g>
            ) : null,
          )}
          <g key={area} clipPath={`url(#${reveal.clipId})`}>
            {gap && <polygon points={gap} className="fill-delta-above/12" />}
            {lines.map((line) => (
              <polyline
                key={line.className}
                points={polyline(line.values, x, y)}
                fill="none"
                strokeWidth={line.width}
                strokeDasharray={line.dash}
                strokeLinejoin="round"
                className={line.className}
              />
            ))}
          </g>
          <FadeInSvg shown={reveal.shown} delay={1.4}>
            {lines.map((line, index) => {
              const lastValue = line.values.at(-1);
              return lastValue === null || lastValue === undefined ? null : (
                <text
                  key={line.className}
                  x={RIGHT + 10}
                  y={y(lastValue) + 4 + (index === 0 ? -8 : 8)}
                  fontSize="13"
                  fontWeight="600"
                  className={line.text}
                >
                  {line.label}
                </text>
              );
            })}
          </FadeInSvg>
          <ChartHover
            count={rows.length}
            x={x}
            top={TOP}
            bottom={BOTTOM}
            left={LEFT}
            right={RIGHT}
            viewWidth={840}
            title={(index) => monthLabel(rows[index].month)}
            rows={(index) =>
              lines.flatMap((line) => {
                const value = line.values[index];
                return value === null
                  ? []
                  : [
                      {
                        label: line.label,
                        value: formatCount(value),
                        swatch: line.swatch,
                      },
                    ];
              })
            }
            points={(index) =>
              lines.flatMap((line) => {
                const value = line.values[index];
                return value === null
                  ? []
                  : [{ y: y(value), className: line.className }];
              })
            }
          />
        </svg>
      </div>
    </figure>
  );
}
