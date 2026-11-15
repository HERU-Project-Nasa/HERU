"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  formatDayMonth,
  formatUpdatedAt,
  PASSES_OPTIONS,
} from "@/fire-calendar/calendar-labels";
import type { CalendarPasses } from "@/fire-calendar/calendar-matrix";
import { SegmentedChoice } from "@/fire-calendar/segmented-choice";
import { MaterialSymbol } from "@/icons/material-symbols";
import { type CountryRow, countryName } from "@/pipeline/pipeline-countries";
import { type CoverageRow, readCoverage } from "@/pipeline/pipeline-coverage";
import {
  type LatestBatchRow,
  usePipelineFile,
} from "@/pipeline/pipeline-files";
import { PIPELINE_BASE } from "@/pipeline/read-pipeline-csv";
import { seriesPath, WORLD_AREA } from "@/pipeline/series-row";

type ValidationRow = Record<
  | "scope"
  | "id"
  | "k"
  | "k20"
  | "median_error_2020_2024"
  | "r_log10"
  | "k_d"
  | "k_n"
  | "k20_d"
  | "k20_n"
  | "calib_years"
  | "calib_years_k20",
  string
>;

const WORLD_IDS = new Set(["world", "global", "mundo", "wld"]);
const FACTOR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PERCENT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

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

function validationRowFor(
  rows: ValidationRow[] | null,
  area: string,
): ValidationRow | null {
  return (
    rows?.find((row) =>
      area === WORLD_AREA
        ? WORLD_IDS.has(row.scope.toLowerCase()) ||
          WORLD_IDS.has(row.id.toLowerCase())
        : row.id === area,
    ) ?? null
  );
}

function factor(text: string | undefined): string | null {
  const value = Number(text);
  return text && Number.isFinite(value) ? FACTOR.format(value) : null;
}

function errorPercent(text: string | undefined): string | null {
  const value = Number(text);
  if (!text || !Number.isFinite(value)) {
    return null;
  }
  return `${PERCENT.format(value <= 1 ? value * 100 : value)}%`;
}

function Figure({
  value,
  description,
}: {
  value: string | null;
  description: string;
}) {
  return (
    <div className="flex min-w-0 flex-col-reverse justify-end gap-0.5">
      <dt className="type-body-sm text-ink-muted">{description}</dt>
      <dd className="font-text text-2xl leading-8 font-semibold whitespace-nowrap text-ink tabular-nums">
        {value ?? <span className="text-ink-disabled">em cálculo</span>}
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

  return (
    <section
      aria-labelledby="confidence-title"
      className="flex flex-col gap-5 rounded-md border border-line bg-surface p-6"
    >
      <h2 id="confidence-title" className="type-heading-sm text-ink">
        Quanto dá para confiar?
      </h2>
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
          value={k}
          description={`focos VIIRS por foco MODIS (k${passName})${row?.calib_years ? `, calibrado em ${row.calib_years}` : ""}`}
        />
        <Figure
          value={k20}
          description={`focos S-NPP por foco NOAA-20 (k20${passName})${row?.calib_years_k20 ? `, calibrado em ${row.calib_years_k20}` : ""}`}
        />
        <Figure
          value={
            passes === "all" ? errorPercent(row?.median_error_2020_2024) : null
          }
          description="erro mediano mensal da reconstrução, 2020-2024"
        />
        <Figure
          value={passes === "all" ? factor(row?.r_log10) : null}
          description="correlação r em escala log, 2020-2024"
        />
      </dl>
      {!row && (
        <p className="type-body-sm flex items-start gap-2 text-ink-muted">
          <MaterialSymbol name="schedule" className="mt-0.5 size-4 shrink-0" />
          Os fatores desta região ainda não foram publicados. Eles aparecem aqui
          assim que a validação for gerada.
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
