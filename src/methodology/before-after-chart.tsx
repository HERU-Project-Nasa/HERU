"use client";

import { useRef } from "react";
import {
  formatCompact,
  formatCount,
  formatRatio,
} from "@/fire-calendar/calendar-labels";
import { CALENDAR_FIRST_YEAR } from "@/fire-calendar/calendar-matrix";
import { useTr } from "@/i18n/locale";
import { MaterialSymbol } from "@/icons/material-symbols";
import { type CountryRow, countryName } from "@/pipeline/pipeline-countries";
import { type CoverageRow, readCoverage } from "@/pipeline/pipeline-coverage";
import { usePipelineFile } from "@/pipeline/pipeline-files";
import {
  type SeriesYearRow,
  seriesPath,
  WORLD_AREA,
} from "@/pipeline/series-row";
import {
  factor,
  useMethodologyArea,
  type ValidationRow,
  validationRowFor,
} from "./methodology-figures";
import {
  ChartHover,
  FadeInSvg,
  RevealClip,
  useChartReveal,
} from "@/motion/chart-motion";

const LEFT = 64;
const RIGHT = 690;
const TOP = 24;
const BOTTOM = 288;
const VIIRS_FIRST_YEAR = 2012;
const CALIBRATION_LAST_YEAR = 2019;

type Point = { year: number; value: number | null };

export function niceStep(maximum: number): number {
  const rough = maximum / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  return (
    (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power
  );
}

function segments(
  points: Point[],
  x: (year: number) => number,
  y: (value: number) => number,
): string[] {
  const lines: string[][] = [[]];
  for (const point of points) {
    if (point.value === null) {
      if (lines.at(-1)!.length) lines.push([]);
      continue;
    }
    lines
      .at(-1)!
      .push(`${x(point.year).toFixed(1)},${y(point.value).toFixed(1)}`);
  }
  return lines.filter((line) => line.length > 1).map((line) => line.join(" "));
}

export function BeforeAfterChart() {
  const t = useTr();
  const [area] = useMethodologyArea();
  const figureRef = useRef<HTMLElement>(null);
  const reveal = useChartReveal(figureRef);
  const yearly = usePipelineFile<SeriesYearRow>(seriesPath("yearly", area));
  const coverageRows = usePipelineFile<CoverageRow>("meta/coverage.csv").rows;
  const countries = usePipelineFile<CountryRow>("meta/countries.csv").rows;
  const validation = usePipelineFile<ValidationRow>("meta/validation.csv");
  const k = factor(validationRowFor(validation.rows, area)?.k);
  const lastDataDate = coverageRows
    ? readCoverage(coverageRows).lastDataDate
    : null;
  const country = countries?.find((candidate) => candidate.iso3 === area);
  const areaName =
    area === WORLD_AREA
      ? t("World", "Mundo")
      : country
        ? countryName(country)
        : "";

  if (!yearly.rows || !lastDataDate) {
    return (
      <figure
        ref={figureRef}
        className="h-[360px] animate-pulse rounded-md border border-line bg-surface"
      />
    );
  }

  const lastYear = Number(lastDataDate.slice(0, 4)) - 1;
  const rows = yearly.rows.filter(
    (row) => row.year >= CALENDAR_FIRST_YEAR && row.year <= lastYear,
  );
  const modis: Point[] = rows.map((row) => ({
    year: row.year,
    value: row.modis,
  }));
  const raw: Point[] = rows.map((row) => ({
    year: row.year,
    value: row.year < VIIRS_FIRST_YEAR ? row.modis : row.viirs_snpp,
  }));
  const harmonized: Point[] = rows.map((row) => ({
    year: row.year,
    value: row.harmonized,
  }));
  const values = [...modis, ...raw, ...harmonized].flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  const step = niceStep(Math.max(1, ...values));
  const top = Math.ceil(Math.max(1, ...values) / step) * step;
  const x = (year: number) =>
    LEFT +
    ((year - CALENDAR_FIRST_YEAR) / (lastYear - CALENDAR_FIRST_YEAR)) *
      (RIGHT - LEFT);
  const y = (value: number) => BOTTOM - (value / top) * (BOTTOM - TOP);
  const ticks = Array.from(
    { length: Math.round(top / step) + 1 },
    (_, index) => index * step,
  );
  const before = raw.find(
    (point) => point.year === VIIRS_FIRST_YEAR - 1,
  )?.value;
  const after = raw.find((point) => point.year === VIIRS_FIRST_YEAR)?.value;
  const jump = before && after ? after / before : null;
  const hasViirs = raw.some(
    (point) => point.year >= VIIRS_FIRST_YEAR && point.value !== null,
  );
  const hasHarmonized = harmonized.some((point) => point.value !== null);
  const lines = [
    {
      points: modis,
      label: t("MODIS only", "Só MODIS"),
      className: "stroke-ink-muted",
      swatch: "fill-ink-muted",
      width: 1.5,
      dash: undefined,
      text: "fill-ink-muted",
    },
    {
      points: raw,
      label: t("Raw sum", "Soma bruta"),
      className: "stroke-delta-above",
      swatch: "fill-delta-above",
      width: 2,
      dash: "6 5",
      text: "fill-delta-above",
    },
    {
      points: harmonized,
      label: t("Harmonized", "Harmonizada"),
      className: "stroke-ink",
      swatch: "fill-ink",
      width: 3,
      dash: undefined,
      text: "fill-ink",
    },
  ];

  return (
    <figure
      ref={figureRef}
      className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4 sm:p-6"
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="flex flex-col gap-1">
          <span className="type-heading-sm text-ink">
            {t(
              `Before and after harmonization · ${areaName}`,
              `Antes e depois da harmonização · ${areaName}`,
            )}
          </span>
          {k && (
            <span className="type-body-sm text-ink-muted">
              {area === WORLD_AREA
                ? t(
                    `Worldwide, 1 MODIS hotspot ≈ ${k} VIIRS hotspots.`,
                    `No mundo, 1 foco MODIS ≈ ${k} focos VIIRS.`,
                  )
                : t(
                    `In this area, 1 MODIS hotspot ≈ ${k} VIIRS hotspots.`,
                    `Nesta área, 1 foco MODIS ≈ ${k} focos VIIRS.`,
                  )}
            </span>
          )}
        </span>
        <span className="type-body-sm text-ink-muted">
          {t(
            `Hotspots per year, ${CALENDAR_FIRST_YEAR} to ${lastYear}`,
            `Focos por ano, de ${CALENDAR_FIRST_YEAR} a ${lastYear}`,
          )}
        </span>
      </figcaption>
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 840 320"
          role="img"
          aria-label={t(
            `Hotspots per year in ${areaName}, ${CALENDAR_FIRST_YEAR} to ${lastYear}: MODIS only, the raw sum of MODIS through 2011 and VIIRS S-NPP after that, and the harmonized series.${jump ? ` The raw sum changes ${formatRatio(jump)} times in 2012.` : ""}`,
            `Focos por ano em ${areaName}, de ${CALENDAR_FIRST_YEAR} a ${lastYear}: só MODIS, soma bruta de MODIS até 2011 e VIIRS S-NPP depois, e série harmonizada.${jump ? ` A soma bruta muda ${formatRatio(jump)} vezes em 2012.` : ""}`,
          )}
          className="block w-full min-w-[640px] touch-pan-y font-ui"
        >
          <defs>
            <RevealClip
              id={reveal.clipId}
              x={0}
              y={0}
              width={840}
              height={320}
              shown={reveal.shown}
              reduced={reveal.reduced}
              replayKey={area}
            />
          </defs>
          <FadeInSvg shown={reveal.shown}>
            <rect
              x={x(VIIRS_FIRST_YEAR)}
              y={TOP}
              width={x(CALIBRATION_LAST_YEAR) - x(VIIRS_FIRST_YEAR)}
              height={BOTTOM - TOP}
              className="fill-viirs-adjusted/8"
            />
            <text
              x={(x(VIIRS_FIRST_YEAR) + x(CALIBRATION_LAST_YEAR)) / 2}
              y={BOTTOM - 8}
              fontSize="12"
              letterSpacing="1"
              textAnchor="middle"
              className="fill-viirs-adjusted"
            >
              {t("CALIBRATION YEARS", "ANOS DE CALIBRAÇÃO")}
            </text>
          </FadeInSvg>
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
          <line
            x1={x(VIIRS_FIRST_YEAR)}
            x2={x(VIIRS_FIRST_YEAR)}
            y1={TOP - 8}
            y2={BOTTOM}
            strokeDasharray="3 4"
            className="stroke-ink"
          />
          {jump && (
            <FadeInSvg shown={reveal.shown} delay={0.9}>
              <text
                x={x(VIIRS_FIRST_YEAR) + 8}
                y={TOP + 4}
                fontSize="13"
                fontWeight="600"
                className="fill-ink"
              >
                {t(
                  `2012: the raw sum changes ${formatRatio(jump)}×`,
                  `2012: a soma bruta muda ${formatRatio(jump)}×`,
                )}
              </text>
              <text
                x={x(VIIRS_FIRST_YEAR) + 8}
                y={TOP + 20}
                fontSize="12"
                className="fill-ink-muted"
              >
                {t(
                  "VIIRS comes in; the heat sources do not change",
                  "o VIIRS entra; as fontes de calor não mudam",
                )}
              </text>
            </FadeInSvg>
          )}
          <g key={area} clipPath={`url(#${reveal.clipId})`}>
            {lines.map((line) =>
              segments(line.points, x, y).map((points) => (
                <polyline
                  key={`${line.className}-${points.slice(0, 12)}`}
                  points={points}
                  fill="none"
                  strokeWidth={line.width}
                  strokeDasharray={line.dash}
                  strokeLinejoin="round"
                  className={line.className}
                />
              )),
            )}
          </g>
          <FadeInSvg shown={reveal.shown} delay={1.4}>
            {lines.map((line) => {
              const last = [...line.points]
                .reverse()
                .find((point) => point.value !== null);
              return last ? (
                <text
                  key={line.className}
                  x={x(last.year) + 10}
                  y={y(last.value!) + 4}
                  fontSize="13"
                  fontWeight="600"
                  className={line.text}
                >
                  {line.label}
                </text>
              ) : null;
            })}
          </FadeInSvg>
          {ticks.length > 0 &&
            Array.from(
              { length: Math.floor((lastYear - CALENDAR_FIRST_YEAR) / 3) + 1 },
              (_, index) => CALENDAR_FIRST_YEAR + index * 3,
            ).map((year) => (
              <text
                key={year}
                x={x(year)}
                y="310"
                fontSize="12"
                textAnchor="middle"
                className="fill-ink-muted"
              >
                {year}
              </text>
            ))}
          <ChartHover
            count={rows.length}
            x={(index) => x(rows[index].year)}
            top={TOP}
            bottom={BOTTOM}
            left={LEFT}
            right={RIGHT}
            viewWidth={840}
            title={(index) => String(rows[index].year)}
            rows={(index) =>
              lines.flatMap((line) => {
                const value = line.points[index].value;
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
                const value = line.points[index].value;
                return value === null
                  ? []
                  : [{ y: y(value), className: line.className }];
              })
            }
          />
        </svg>
      </div>
      {(!hasViirs || !hasHarmonized) && (
        <p className="type-body-sm flex items-start gap-2 text-ink-muted">
          <MaterialSymbol name="schedule" className="mt-0.5 size-4 shrink-0" />
          {!hasViirs
            ? t(
                "VIIRS S-NPP for this region has not been published yet; for now the raw sum line stops in 2011.",
                "O VIIRS S-NPP desta região ainda não foi publicado; por enquanto a linha da soma bruta para em 2011.",
              )
            : t(
                "The harmonized series for this region is still being computed.",
                "A série harmonizada desta região ainda está em cálculo.",
              )}
        </p>
      )}
    </figure>
  );
}
