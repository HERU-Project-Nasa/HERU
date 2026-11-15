"use client";

import { AnimatePresence, m } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  capitalized,
  formatCount,
  formatFullDate,
  formatUpdatedAt,
  hotspotsWord,
  PASSES_OPTIONS,
} from "@/fire-calendar/calendar-labels";
import type { CalendarPasses } from "@/fire-calendar/calendar-matrix";
import { SegmentedChoice } from "@/fire-calendar/segmented-choice";
import { compareLabels, localNumberFormat } from "@/i18n/format";
import { inLocale, localized, tr, useLocale, useTr } from "@/i18n/locale";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import { type CountryRow, countryName } from "@/pipeline/pipeline-countries";
import { type CoverageRow, readCoverage } from "@/pipeline/pipeline-coverage";
import {
  type LatestBatchRow,
  usePipelineFile,
} from "@/pipeline/pipeline-files";
import { PIPELINE_BASE } from "@/pipeline/read-pipeline-csv";
import { seriesPath, WORLD_AREA } from "@/pipeline/series-row";
import { AnimatedNumber, EASE_STANDARD } from "@/motion/chart-motion";

export type ValidationRow = Record<
  | "scope"
  | "id"
  | "k"
  | "k20"
  | "median_error_2020_2024"
  | "r_log10"
  | "months_used"
  | "country_agreement"
  | "k_d"
  | "k_n"
  | "calib_years"
  | "modis_calib_hotspots"
  | "k20_d"
  | "k20_n"
  | "calib_years_k20"
  | "noaa20_calib_hotspots",
  string
>;

const FACTOR = localNumberFormat({
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PERCENT = localNumberFormat({ maximumFractionDigits: 1 });
const HIGH_CONFIDENCE_HOTSPOTS = 10000;
const MEDIUM_CONFIDENCE_HOTSPOTS = 1000;

type ConfidenceLevel = "high" | "medium" | "low";

type ConfidenceLook = {
  label: string;
  symbol: SymbolName;
  className: string;
  description: string;
};

const CONFIDENCE_LOOKS = localized<Record<ConfidenceLevel, ConfidenceLook>>(
  {
    high: {
      label: "High confidence",
      symbol: "verified",
      className: "bg-status-live/14 text-status-live",
      description:
        "Many MODIS hotspots in the calibration years: 10,000 or more.",
    },
    medium: {
      label: "Medium confidence",
      symbol: "adjust",
      className: "bg-status-stale/12 text-status-stale",
      description:
        "Moderate volume, from 1,000 to 9,999 hotspots: read small differences with caution.",
    },
    low: {
      label: "Low confidence",
      symbol: "error",
      className: "bg-alert/14 text-delta-above",
      description:
        "Too few hotspots to calibrate the area on its own, fewer than 1,000. A block like this uses the world k.",
    },
  },
  {
    high: {
      label: "Confiança alta",
      symbol: "verified",
      className: "bg-status-live/14 text-status-live",
      description: "Muitos focos MODIS nos anos de calibração: 10.000 ou mais.",
    },
    medium: {
      label: "Confiança média",
      symbol: "adjust",
      className: "bg-status-stale/12 text-status-stale",
      description:
        "Volume intermediário, de 1.000 a 9.999 focos: leia as diferenças pequenas com cautela.",
    },
    low: {
      label: "Confiança baixa",
      symbol: "error",
      className: "bg-alert/14 text-delta-above",
      description:
        "Poucos focos para calibrar a área sozinha, menos de 1.000. Um bloco assim usa o k do mundo.",
    },
  },
);

const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["high", "medium", "low"];

export function useMethodologyArea(): [string, (area: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const area = searchParams.get("area") ?? WORLD_AREA;
  return [
    area,
    (next) =>
      router.replace(`${pathname}?area=${next}`, {
        scroll: false,
      }),
  ];
}

export function validationRowFor(
  rows: ValidationRow[] | null,
  area: string,
): ValidationRow | null {
  return (
    rows?.find((row) =>
      area === WORLD_AREA
        ? row.scope === "world"
        : row.scope === "country" && row.id === area,
    ) ?? null
  );
}

function numeric(text: string | undefined): number | null {
  const value = Number(text);
  return text && Number.isFinite(value) ? value : null;
}

const formatFactor = (value: number) => FACTOR.format(value);
const formatPercent = (value: number) => `${PERCENT.format(value * 100)}%`;

export function factor(text: string | undefined): string | null {
  const value = numeric(text);
  return value === null ? null : formatFactor(value);
}

function percent(text: string | undefined): string | null {
  const value = numeric(text);
  return value === null ? null : formatPercent(value);
}

/** "1,234 MODIS hotspots" in English, "1.234 focos MODIS" in Portuguese. */
function sensorHotspots(value: number, sensor: string): string {
  return tr(
    `${formatCount(value)} ${sensor} ${hotspotsWord(value)}`,
    `${formatCount(value)} ${hotspotsWord(value)} ${sensor}`,
  );
}

function validationDetails(row: ValidationRow): string[] {
  const months = Number(row.months_used);
  const agreement = percent(row.country_agreement);
  return [
    row.months_used
      ? months === 1
        ? tr(
            `${months} month compared in 2020-2024`,
            `${months} mês comparado em 2020-2024`,
          )
        : tr(
            `${months} months compared in 2020-2024`,
            `${months} meses comparados em 2020-2024`,
          )
      : null,
    row.modis_calib_hotspots
      ? tr(
          `${sensorHotspots(Number(row.modis_calib_hotspots), "MODIS")} in the k calibration`,
          `${sensorHotspots(Number(row.modis_calib_hotspots), "MODIS")} na calibração do k`,
        )
      : null,
    row.noaa20_calib_hotspots
      ? tr(
          `${sensorHotspots(Number(row.noaa20_calib_hotspots), "NOAA-20")} in the k20 calibration`,
          `${sensorHotspots(Number(row.noaa20_calib_hotspots), "NOAA-20")} na calibração do k20`,
        )
      : null,
    agreement
      ? tr(
          `country agreement of ${agreement}`,
          `concordância de país de ${agreement}`,
        )
      : null,
  ].filter((detail) => detail !== null);
}

function confidenceLevel(row: ValidationRow | null): ConfidenceLevel | null {
  const hotspots = Number(row?.modis_calib_hotspots);
  if (!row?.modis_calib_hotspots || !Number.isFinite(hotspots)) {
    return null;
  }
  return hotspots >= HIGH_CONFIDENCE_HOTSPOTS
    ? "high"
    : hotspots >= MEDIUM_CONFIDENCE_HOTSPOTS
      ? "medium"
      : "low";
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  useLocale();
  const { label, symbol, className } = CONFIDENCE_LOOKS[level];
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-sm px-2 font-ui text-xs leading-4 font-semibold tracking-[0.06em] whitespace-nowrap uppercase ${className}`}
    >
      <MaterialSymbol name={symbol} className="size-4" />
      {label}
    </span>
  );
}

const SCALE_MIN_POWER = 1;
const SCALE_MAX_POWER = 8;
const SCALE_ZONES: {
  level: ConfidenceLevel;
  from: number;
  to: number;
  className: string;
}[] = [
  {
    level: "low",
    from: 10 ** SCALE_MIN_POWER,
    to: MEDIUM_CONFIDENCE_HOTSPOTS,
    className: "bg-alert/55",
  },
  {
    level: "medium",
    from: MEDIUM_CONFIDENCE_HOTSPOTS,
    to: HIGH_CONFIDENCE_HOTSPOTS,
    className: "bg-status-stale/70",
  },
  {
    level: "high",
    from: HIGH_CONFIDENCE_HOTSPOTS,
    to: 10 ** SCALE_MAX_POWER,
    className: "bg-status-live/70",
  },
];

function scalePosition(hotspots: number): number {
  const power = Math.log10(Math.max(hotspots, 10 ** SCALE_MIN_POWER));
  return Math.min(
    1,
    (power - SCALE_MIN_POWER) / (SCALE_MAX_POWER - SCALE_MIN_POWER),
  );
}

/** Where the chosen region falls between the confidence thresholds, on a log scale. */
export function ConfidenceScale() {
  const t = useTr();
  const [area] = useMethodologyArea();
  const validation = usePipelineFile<ValidationRow>("meta/validation.csv");
  const countries = usePipelineFile<CountryRow>("meta/countries.csv").rows;
  const row = validationRowFor(validation.rows, area);
  const hotspots = numeric(row?.modis_calib_hotspots);
  const country = countries?.find((candidate) => candidate.iso3 === area);
  const areaName =
    area === WORLD_AREA
      ? t("World", "Mundo")
      : country
        ? countryName(country)
        : area;

  return (
    <figure className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4 sm:p-5">
      <figcaption className="type-caption text-ink-muted">
        {t(
          "MODIS hotspots in the calibration years · log scale",
          "Focos MODIS nos anos de calibração · escala log",
        )}
      </figcaption>
      <div className="relative pt-9 pb-6">
        <div
          aria-hidden="true"
          className="flex h-2.5 overflow-hidden rounded-full"
        >
          {SCALE_ZONES.map((zone, index) => (
            <m.span
              key={zone.level}
              className={`h-full ${zone.className}`}
              style={{
                width: `${(scalePosition(zone.to) - scalePosition(zone.from)) * 100}%`,
                originX: 0,
              }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.25,
                ease: EASE_STANDARD,
              }}
            />
          ))}
        </div>
        {[MEDIUM_CONFIDENCE_HOTSPOTS, HIGH_CONFIDENCE_HOTSPOTS].map((tick) => (
          <span
            key={tick}
            aria-hidden="true"
            className="type-caption absolute bottom-0 -translate-x-1/2 text-[10px] text-ink-muted tabular-nums"
            style={{ left: `${scalePosition(tick) * 100}%` }}
          >
            {formatCount(tick)}
          </span>
        ))}
        <AnimatePresence>
          {hotspots !== null && (
            <m.span
              aria-hidden="true"
              className="absolute top-0 flex w-0 flex-col items-center gap-1"
              initial={{ opacity: 0, left: "0%" }}
              animate={{
                opacity: 1,
                left: `${scalePosition(hotspots) * 100}%`,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: EASE_STANDARD }}
            >
              <m.span
                className="type-data self-start rounded-sm bg-surface-raised px-1.5 py-0.5 text-xs whitespace-nowrap text-ink"
                initial={{ x: "0%" }}
                animate={{ x: `${-scalePosition(hotspots) * 100}%` }}
                transition={{ duration: 0.8, ease: EASE_STANDARD }}
              >
                {areaName}
              </m.span>
              <span className="h-4 w-0.5 shrink-0 rounded-full bg-ink" />
            </m.span>
          )}
        </AnimatePresence>
      </div>
      <p className="type-body-sm text-ink-muted">
        {hotspots !== null
          ? t(
              `${areaName}: ${sensorHotspots(hotspots, "MODIS")} in calibration. Change the region in the panel at the top.`,
              `${areaName}: ${sensorHotspots(hotspots, "MODIS")} na calibração. Troque a região no painel do topo.`,
            )
          : validation.rows
            ? t(
                "The pipeline has not published the calibration volume for this region yet.",
                "A pipeline ainda não publicou o volume de calibração desta região.",
              )
            : " "}
      </p>
    </figure>
  );
}

export function ConfidenceLegend() {
  useLocale();
  return (
    <dl className="flex flex-col gap-3">
      {CONFIDENCE_LEVELS.map((level) => (
        <div
          key={level}
          className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4"
        >
          <dt className="sm:w-44">
            <ConfidenceBadge level={level} />
          </dt>
          <dd className="type-body text-ink-muted">
            {CONFIDENCE_LOOKS[level].description}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Figure({
  value,
  format,
  description,
  missing,
}: {
  value: number | null;
  format: (value: number) => string;
  description: string;
  missing: string;
}) {
  return (
    <div className="flex min-w-0 flex-col-reverse justify-end gap-0.5 border-l-2 border-line pl-3">
      <dt className="type-body-sm text-ink-muted">{description}</dt>
      <dd className="font-text text-2xl leading-8 font-semibold whitespace-nowrap text-ink tabular-nums">
        {value === null ? (
          <span className="text-ink-disabled">{missing}</span>
        ) : (
          <AnimatedNumber value={value} format={format} />
        )}
      </dd>
    </div>
  );
}

export function MethodologyFigures() {
  const locale = useLocale();
  const t = useTr();
  const [area, setArea] = useMethodologyArea();
  const [passes, setPasses] = useState<CalendarPasses>("all");
  const validation = usePipelineFile<ValidationRow>("meta/validation.csv");
  const countries = usePipelineFile<CountryRow>("meta/countries.csv").rows;
  const options = useMemo(
    () =>
      inLocale(locale, () => [
        { value: WORLD_AREA, label: tr("World", "Mundo") },
        ...(countries ?? [])
          .map((country) => ({
            value: country.iso3,
            label: countryName(country),
          }))
          .sort((a, b) => compareLabels(a.label, b.label)),
      ]),
    [countries, locale],
  );
  const row = validationRowFor(validation.rows, area);
  const passSuffix = passes === "day" ? "_d" : passes === "night" ? "_n" : "";
  const passName =
    passes === "all"
      ? ""
      : passes === "day"
        ? t(", daytime", ", de dia")
        : t(", nighttime", ", de noite");
  const k = numeric(row?.[`k${passSuffix}` as keyof ValidationRow]);
  const k20 = numeric(row?.[`k20${passSuffix}` as keyof ValidationRow]);
  const confidence = confidenceLevel(row);
  const factorsReady = Boolean(
    validationRowFor(validation.rows, WORLD_AREA)?.k,
  );
  const missing = !validation.rows
    ? "\u00a0"
    : factorsReady
      ? t("no data", "sem dado")
      : t("being computed", "em cálculo");

  return (
    <section
      aria-labelledby="confidence-title"
      className="flex flex-col gap-5 rounded-md border border-line bg-surface p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="confidence-title" className="type-heading-sm text-ink">
          {t("How much can you trust it?", "Quanto dá para confiar?")}
        </h2>
        <AnimatePresence mode="wait" initial={false}>
          {confidence && (
            <m.span
              key={confidence}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25, ease: EASE_STANDARD }}
            >
              <ConfidenceBadge level={confidence} />
            </m.span>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="type-caption text-ink-muted">
            {t("Region", "Região")}
          </span>
          <span className="relative inline-flex w-52 items-center">
            <MaterialSymbol
              name="location_on"
              className="pointer-events-none absolute left-2.5 size-[18px]"
            />
            <select
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className="type-chip h-8 w-full cursor-pointer appearance-none rounded-sm border border-line-strong bg-surface pr-8 pl-8 text-ink hover:bg-surface-hover"
            >
              {options.map((option) => (
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
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="type-caption text-ink-muted">
            {t("Overpasses", "Passagens")}
          </span>
          <SegmentedChoice
            label={t("Overpasses", "Passagens")}
            options={PASSES_OPTIONS}
            value={passes}
            onChange={setPasses}
          />
        </div>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Figure
          missing={missing}
          value={k}
          format={formatFactor}
          description={t(
            `VIIRS hotspots per MODIS hotspot (k${passName})${row?.calib_years ? `, calibrated over ${row.calib_years}` : ""}`,
            `focos VIIRS por foco MODIS (k${passName})${row?.calib_years ? `, calibrado em ${row.calib_years}` : ""}`,
          )}
        />
        <Figure
          missing={missing}
          value={k20}
          format={formatFactor}
          description={t(
            `S-NPP hotspots per NOAA-20 hotspot (k20${passName})${row?.calib_years_k20 ? `, calibrated over ${row.calib_years_k20}` : ""}`,
            `focos S-NPP por foco NOAA-20 (k20${passName})${row?.calib_years_k20 ? `, calibrado em ${row.calib_years_k20}` : ""}`,
          )}
        />
        <Figure
          missing={missing}
          value={passes === "all" ? numeric(row?.median_error_2020_2024) : null}
          format={formatPercent}
          description={t(
            "median monthly error of the reconstruction, 2020-2024",
            "erro mediano mensal da reconstrução, 2020-2024",
          )}
        />
        <Figure
          missing={missing}
          value={passes === "all" ? numeric(row?.r_log10) : null}
          format={formatFactor}
          description={t(
            "correlation r on a log scale, 2020-2024",
            "correlação r em escala log, 2020-2024",
          )}
        />
      </dl>
      {row && (
        <p className="type-body-sm text-ink-muted">
          {capitalized(validationDetails(row).join(" · "))}.
        </p>
      )}
      {validation.rows && !row && (
        <p className="type-body-sm flex items-start gap-2 text-ink-muted">
          <MaterialSymbol name="info" className="mt-0.5 size-4 shrink-0" />
          {t(
            "The pipeline has not published the validation for this region. Its hotspots use the k of the 5° blocks they fell in.",
            "A pipeline não publicou a validação desta região. Os focos dela usam o k dos blocos de 5° onde caíram.",
          )}
        </p>
      )}
      {!validation.rows && validation.error && (
        <p className="type-body-sm flex items-start gap-2 text-ink-muted">
          <MaterialSymbol name="schedule" className="mt-0.5 size-4 shrink-0" />
          {t(
            "We could not read the validation right now.",
            "Não conseguimos ler a validação agora.",
          )}
        </p>
      )}
      {row && passes !== "all" && (
        <p className="type-body-sm text-ink-muted">
          {t(
            "The error and the correlation are measured with all overpasses together.",
            "O erro e a correlação são medidos com todas as passagens juntas.",
          )}
        </p>
      )}
      {row && area !== WORLD_AREA && (
        <p className="type-body-sm text-ink-muted">
          {t(
            "A country's series uses the k of each 5° block where the hotspot fell. The country k and the error are diagnostics of that calculation.",
            "A série de um país usa o k de cada bloco de 5° onde o foco caiu. O k do país e o erro são diagnósticos dessa conta.",
          )}
        </p>
      )}
      <a
        href="#harmonizacao"
        className="type-button inline-flex items-center gap-1.5 self-start text-ink"
      >
        {t("How we harmonize", "Como harmonizamos")}
        <MaterialSymbol name="arrow_forward" className="size-[18px]" />
      </a>
    </section>
  );
}

export function MethodologyDates() {
  const t = useTr();
  const latest = usePipelineFile<LatestBatchRow>("meta/latest.csv");
  const coverageRows = usePipelineFile<CoverageRow>("meta/coverage.csv").rows;
  const updatedAt = latest.rows?.[0]?.updated_at;
  const completeDate = coverageRows
    ? readCoverage(coverageRows).completeDate
    : null;
  if (!updatedAt) {
    return null;
  }
  return (
    <p className="type-caption text-ink-muted tabular-nums">
      {t(
        `Updated ${formatUpdatedAt(updatedAt)}`,
        `Atualizado em ${formatUpdatedAt(updatedAt)}`,
      )}
      {completeDate &&
        t(
          ` · complete days through ${formatFullDate(completeDate)}`,
          ` · dias completos até ${formatFullDate(completeDate)}`,
        )}
    </p>
  );
}

export function MethodologyFiles() {
  const t = useTr();
  const [area] = useMethodologyArea();
  const files = [
    { label: "validation.csv", path: "meta/validation.csv" },
    {
      label: "validation_monthly.csv",
      path: "meta/validation_monthly.csv",
    },
    {
      label: t("Monthly series (CSV)", "Série mensal (CSV)"),
      path: seriesPath("monthly", area),
    },
  ];
  return (
    <div className="flex flex-col items-start gap-2 border-t border-line pt-6">
      <span className="type-caption text-ink-muted">
        {t("Files", "Arquivos")}
      </span>
      {files.map((file) => (
        <a
          key={file.path}
          href={PIPELINE_BASE + file.path}
          download
          className="type-button inline-flex h-8 items-center gap-2 rounded-sm border border-line-strong bg-surface-raised px-3 text-ink transition-colors duration-120 ease-standard hover:border-ink"
        >
          <MaterialSymbol name="download" className="size-[18px]" />
          {file.label}
        </a>
      ))}
      <p className="type-body-sm text-ink-muted">
        {t(
          "The same files the site reads, for the region chosen above.",
          "Os mesmos arquivos que o site lê, da região escolhida acima.",
        )}
      </p>
    </div>
  );
}
