"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  capitalized,
  formatDayMonth,
  formatHotspots,
  formatUpdatedAt,
  PASSES_OPTIONS,
} from "@/fire-calendar/calendar-labels";
import type { CalendarPasses } from "@/fire-calendar/calendar-matrix";
import { SegmentedChoice } from "@/fire-calendar/segmented-choice";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import { type CountryRow, countryName } from "@/pipeline/pipeline-countries";
import { type CoverageRow, readCoverage } from "@/pipeline/pipeline-coverage";
import {
  type LatestBatchRow,
  usePipelineFile,
} from "@/pipeline/pipeline-files";
import { PIPELINE_BASE } from "@/pipeline/read-pipeline-csv";
import { seriesPath, WORLD_AREA } from "@/pipeline/series-row";

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

const FACTOR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PERCENT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const HIGH_CONFIDENCE_HOTSPOTS = 10000;
const MEDIUM_CONFIDENCE_HOTSPOTS = 1000;

type ConfidenceLevel = "high" | "medium" | "low";

const CONFIDENCE_LOOKS: Record<
  ConfidenceLevel,
  { label: string; symbol: SymbolName; className: string; description: string }
> = {
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
};

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

export function factor(text: string | undefined): string | null {
  const value = Number(text);
  return text && Number.isFinite(value) ? FACTOR.format(value) : null;
}

function percent(text: string | undefined): string | null {
  const value = Number(text);
  return text && Number.isFinite(value)
    ? `${PERCENT.format(value * 100)}%`
    : null;
}

function validationDetails(row: ValidationRow): string[] {
  const months = Number(row.months_used);
  const agreement = percent(row.country_agreement);
  return [
    row.months_used
      ? `${months} ${months === 1 ? "mês comparado" : "meses comparados"} em 2020-2024`
      : null,
    row.modis_calib_hotspots
      ? `${formatHotspots(Number(row.modis_calib_hotspots))} MODIS na calibração do k`
      : null,
    row.noaa20_calib_hotspots
      ? `${formatHotspots(Number(row.noaa20_calib_hotspots))} NOAA-20 na calibração do k20`
      : null,
    agreement ? `concordância de país de ${agreement}` : null,
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

export function ConfidenceLegend() {
  return (
    <dl className="flex flex-col gap-3">
      {(Object.keys(CONFIDENCE_LOOKS) as ConfidenceLevel[]).map((level) => (
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
  description,
  missing,
}: {
  value: string | null;
  description: string;
  missing: string;
}) {
  return (
    <div className="flex min-w-0 flex-col-reverse justify-end gap-0.5">
      <dt className="type-body-sm text-ink-muted">{description}</dt>
      <dd className="font-text text-2xl leading-8 font-semibold whitespace-nowrap text-ink tabular-nums">
        {value ?? <span className="text-ink-disabled">{missing}</span>}
      </dd>
    </div>
  );
}

export function MethodologyFigures() {
  const [area, setArea] = useMethodologyArea();
  const [passes, setPasses] = useState<CalendarPasses>("all");
  const validation = usePipelineFile<ValidationRow>("meta/validation.csv");
  const countries = usePipelineFile<CountryRow>("meta/countries.csv").rows;
  const options = useMemo(
    () => [
      { value: WORLD_AREA, label: "Mundo" },
      ...(countries ?? [])
        .map((country) => ({
          value: country.iso3,
          label: countryName(country),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    ],
    [countries],
  );
  const row = validationRowFor(validation.rows, area);
  const passSuffix = passes === "day" ? "_d" : passes === "night" ? "_n" : "";
  const passName =
    passes === "all" ? "" : passes === "day" ? ", de dia" : ", de noite";
  const k = factor(row?.[`k${passSuffix}` as keyof ValidationRow]);
  const k20 = factor(row?.[`k20${passSuffix}` as keyof ValidationRow]);
  const confidence = confidenceLevel(row);
  const factorsReady = Boolean(
    validationRowFor(validation.rows, WORLD_AREA)?.k,
  );
  const missing = !validation.rows
    ? "\u00a0"
    : factorsReady
      ? "sem dado"
      : "em cálculo";

  return (
    <section
      aria-labelledby="confidence-title"
      className="flex flex-col gap-5 rounded-md border border-line bg-surface p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="confidence-title" className="type-heading-sm text-ink">
          Quanto dá para confiar?
        </h2>
        {confidence && <ConfidenceBadge level={confidence} />}
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="type-caption text-ink-muted">Região</span>
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
          <span className="type-caption text-ink-muted">Passagens</span>
          <SegmentedChoice
            label="Passagens"
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
          description={`focos VIIRS por foco MODIS (k${passName})${row?.calib_years ? `, calibrado em ${row.calib_years}` : ""}`}
        />
        <Figure
          missing={missing}
          value={k20}
          description={`focos S-NPP por foco NOAA-20 (k20${passName})${row?.calib_years_k20 ? `, calibrado em ${row.calib_years_k20}` : ""}`}
        />
        <Figure
          missing={missing}
          value={passes === "all" ? percent(row?.median_error_2020_2024) : null}
          description="erro mediano mensal da reconstrução, 2020-2024"
        />
        <Figure
          missing={missing}
          value={passes === "all" ? factor(row?.r_log10) : null}
          description="correlação r em escala log, 2020-2024"
        />
      </dl>
      {row && (
        <p className="type-body-sm text-ink-muted">
          {capitalized(validationDetails(row).join(" · "))}.
        </p>
      )}
      {validation.rows && !row && (
        <p className="type-body-sm flex items-start gap-2 text-ink-muted">
          <MaterialSymbol name="info" className="mt-0.5 size-4 shrink-0" />A
          pipeline não publicou a validação desta região. Os focos dela usam o k
          dos blocos de 5° onde caíram.
        </p>
      )}
      {!validation.rows && validation.error && (
        <p className="type-body-sm flex items-start gap-2 text-ink-muted">
          <MaterialSymbol name="schedule" className="mt-0.5 size-4 shrink-0" />
          Não conseguimos ler a validação agora.
        </p>
      )}
      {row && passes !== "all" && (
        <p className="type-body-sm text-ink-muted">
          O erro e a correlação são medidos com todas as passagens juntas.
        </p>
      )}
      {row && area !== WORLD_AREA && (
        <p className="type-body-sm text-ink-muted">
          A série de um país usa o k de cada bloco de 5° onde o foco caiu. O k
          do país e o erro são diagnósticos dessa conta.
        </p>
      )}
      <a
        href="#harmonizacao"
        className="type-button inline-flex items-center gap-1.5 self-start text-ink"
      >
        Como harmonizamos
        <MaterialSymbol name="arrow_forward" className="size-[18px]" />
      </a>
    </section>
  );
}

export function MethodologyDates() {
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
      Atualizado em {formatUpdatedAt(updatedAt)}
      {completeDate &&
        ` · dias completos até ${formatDayMonth(completeDate)}/${completeDate.slice(0, 4)}`}
    </p>
  );
}

export function MethodologyFiles() {
  const [area] = useMethodologyArea();
  const files = [
    { label: "validation.csv", path: "meta/validation.csv" },
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 64dcc6316b354790f1c2374c891c435a06dbd88e
    {
      label: "validation_monthly.csv",
      path: "meta/validation_monthly.csv",
    },
<<<<<<< HEAD
=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
=======
>>>>>>> 64dcc6316b354790f1c2374c891c435a06dbd88e
    { label: "Série mensal (CSV)", path: seriesPath("monthly", area) },
  ];
  return (
    <div className="flex flex-col items-start gap-2 border-t border-line pt-6">
      <span className="type-caption text-ink-muted">Arquivos</span>
      {files.map((file) => (
        <a
          key={file.label}
          href={PIPELINE_BASE + file.path}
          download
          className="type-button inline-flex h-8 items-center gap-2 rounded-sm border border-line-strong bg-surface-raised px-3 text-ink transition-colors duration-120 ease-standard hover:border-ink"
        >
          <MaterialSymbol name="download" className="size-[18px]" />
          {file.label}
        </a>
      ))}
      <p className="type-body-sm text-ink-muted">
        Os mesmos arquivos que o site lê, da região escolhida acima.
      </p>
    </div>
  );
}
