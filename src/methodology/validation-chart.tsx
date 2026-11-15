"use client";

import {
  formatCompact,
  MONTH_ABBREVIATIONS,
} from "@/fire-calendar/calendar-labels";
import { MaterialSymbol } from "@/icons/material-symbols";
import { type CountryRow, countryName } from "@/pipeline/pipeline-countries";
import { usePipelineFile } from "@/pipeline/pipeline-files";
import { WORLD_AREA } from "@/pipeline/series-row";
import { niceStep } from "./before-after-chart";
import { useMethodologyArea } from "./methodology-figures";

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

export function ValidationChart() {
  const [area] = useMethodologyArea();
  const file = usePipelineFile<ValidationMonthRow>(VALIDATION_MONTHLY_PATH);
  const countries = usePipelineFile<CountryRow>("meta/countries.csv").rows;
  const country = countries?.find((candidate) => candidate.iso3 === area);
  const areaName =
    area === WORLD_AREA ? "Mundo" : country ? countryName(country) : "";

  if (!file.rows) {
    return file.error ? null : (
      <div className="h-[340px] animate-pulse rounded-md border border-line bg-surface" />
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
        <MaterialSymbol name="info" className="mt-0.5 size-4 shrink-0" />A
        pipeline não publicou a validação mês a mês desta região.
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
  const first = rows[0].month;
  const last = rows.at(-1)!.month;
  const lines = [
    {
      values: observed,
      label: "S-NPP observado",
      className: "stroke-ink",
      width: 2.5,
      dash: undefined,
      text: "fill-ink",
    },
    {
      values: rebuilt,
      label: "MODIS × k",
      className: "stroke-delta-above",
      width: 2,
      dash: "6 5",
      text: "fill-delta-above",
    },
  ];

  return (
    <figure className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4 sm:p-6">
      <figcaption className="flex flex-col gap-1">
        <span className="type-heading-sm text-ink">
          Observado e reconstruído · {areaName}
        </span>
        <span className="type-body-sm text-ink-muted">
          Focos por mês, de {MONTH_ABBREVIATIONS[Number(first.slice(5)) - 1]}{" "}
          {first.slice(0, 4)} a {MONTH_ABBREVIATIONS[Number(last.slice(5)) - 1]}{" "}
          {last.slice(0, 4)}. A linha tracejada é o que o MODIS × k diria; a
          contínua, o que o S-NPP viu.
        </span>
      </figcaption>
      <div className="relative overflow-x-auto">
        <svg
          viewBox="0 0 840 290"
          role="img"
          aria-label={`Focos por mês em ${areaName}, de ${first} a ${last}: o S-NPP observado e o reconstruído a partir do MODIS vezes k.`}
          className="block w-full min-w-[640px] font-ui"
        >
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
          {lines.map((line) => (
            <polyline
              key={line.label}
              points={polyline(line.values, x, y)}
              fill="none"
              strokeWidth={line.width}
              strokeDasharray={line.dash}
              strokeLinejoin="round"
              className={line.className}
            />
          ))}
          {lines.map((line, index) => {
            const lastValue = line.values.at(-1);
            return lastValue === null || lastValue === undefined ? null : (
              <text
                key={line.label}
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
        </svg>
      </div>
    </figure>
  );
}
