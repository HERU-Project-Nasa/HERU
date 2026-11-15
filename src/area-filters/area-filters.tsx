"use client";

import { m } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { buttonClassName } from "@/button/button-class-name";
import {
  AREA_SOURCES,
  formatArea,
  type CountryOutline,
  useCountryOutlines,
} from "@/country-outlines/country-outlines";
import { formatCount, formatDayMonth } from "@/fire-calendar/calendar-labels";
import { CALENDAR_FIRST_YEAR } from "@/fire-calendar/calendar-matrix";
import { MaterialSymbol } from "@/icons/material-symbols";
import { FadeUp } from "@/motion/fade-up";
import { type CountryRow, countryName } from "@/pipeline/pipeline-countries";
import { type CoverageRow, readCoverage } from "@/pipeline/pipeline-coverage";
import { usePipelineFile } from "@/pipeline/pipeline-files";
import { areaMapHref } from "./area-links";
import { type Continent, CONTINENTS, findContinent } from "./continents";
import {
  useCountryYearTotals,
  type YearTotalColumn,
} from "./use-country-year-totals";

const VISIBLE_COUNTRIES = 8;

const TOTAL_UNITS: Record<YearTotalColumn, string> = {
  harmonized: "focos equivalentes VIIRS",
  modis: "focos MODIS",
};

type CountryChoice = CountryRow & { label: string; total: number | null };

const CARD_BASE_CLASS_NAME =
  "group relative flex cursor-pointer flex-col rounded-lg border p-4 text-left transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-standard motion-safe:hover:-translate-y-0.5";
const CARD_IDLE_CLASS_NAME =
  "border-line bg-linear-to-b from-surface-hover/60 to-surface text-ink hover:border-line-strong hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)]";
const CARD_SELECTED_CLASS_NAME =
  "border-selected bg-selected text-ink-inverse shadow-[0_12px_32px_rgba(0,0,0,0.45)] hover:bg-selected-hover";

const SEARCH_FORM = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function StepTitle({ step, title }: { step: number; title: string }) {
  return (
    <h3 className="type-caption flex items-center gap-3 text-[18px] leading-6 tracking-[0.08em] text-ink">
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-full border border-line-strong text-[12px] tracking-normal text-ink-muted tabular-nums"
      >
        {String(step).padStart(2, "0")}
      </span>
      {title}
    </h3>
  );
}

function GroupHeader({
  step,
  title,
  aside,
}: {
  step: number;
  title: string;
  aside?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3">
      <StepTitle step={step} title={title} />
      {aside && <span className="type-body-sm text-ink-muted">{aside}</span>}
    </div>
  );
}

function ContinentCard({
  continent,
  countryCount,
  total,
  unit,
  year,
  selected,
  onSelect,
}: {
  continent: Continent;
  countryCount: number;
  total: number | null;
  unit: string;
  year: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`${CARD_BASE_CLASS_NAME} gap-2 ${selected ? CARD_SELECTED_CLASS_NAME : CARD_IDLE_CLASS_NAME}`}
    >
      <span
        className={`type-eyebrow flex items-center gap-2 ${selected ? "" : "text-ink-muted"}`}
      >
        <span
          className={`flex size-7 items-center justify-center rounded-full ${selected ? "bg-ink-inverse/10" : "bg-surface-raised text-ink group-hover:bg-line"}`}
        >
          <MaterialSymbol name={continent.icon} className="size-4" />
        </span>
        {continent.name}
        <MaterialSymbol
          name={selected ? "verified" : "arrow_forward"}
          className={`ml-auto size-[18px] transition-[opacity,transform] duration-200 ease-standard ${selected ? "" : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100"}`}
        />
      </span>
      <span className="type-heading-sm">
        {countryCount}{" "}
        {countryCount === 1 ? "país disponível" : "países disponíveis"}
      </span>
      <span
        className={`type-body-sm tabular-nums ${selected ? "" : "text-ink-muted"}`}
      >
        {total === null
          ? "Somando os focos"
          : `${formatCount(total)} ${unit} em ${year}`}
      </span>
    </button>
  );
}

function CountryCard({
  country,
  outline,
  largest,
  year,
  selected,
  onSelect,
}: {
  country: CountryChoice;
  outline: CountryOutline | undefined;
  largest: number;
  year: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`${CARD_BASE_CLASS_NAME} gap-3 ${selected ? CARD_SELECTED_CLASS_NAME : CARD_IDLE_CLASS_NAME}`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`type-eyebrow min-w-0 flex-1 truncate ${selected ? "" : "text-ink-muted"}`}
        >
          {country.label}
        </span>
        {selected && (
          <MaterialSymbol name="verified" className="size-[18px] shrink-0" />
        )}
      </span>
      <span className="flex h-24 items-center justify-center">
        {outline?.path ? (
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="h-full w-auto"
          >
            <path d={outline.path} fill="currentColor" fillRule="evenodd" />
          </svg>
        ) : (
          <span className="size-16 rounded-full bg-line" aria-hidden="true" />
        )}
      </span>
      <span className="flex items-baseline justify-between gap-2">
        <span className={`type-body-sm ${selected ? "" : "text-ink-muted"}`}>
          Focos em {year}
        </span>
        <span className="type-data">
          {country.total === null ? "-" : formatCount(country.total)}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`block h-1 overflow-hidden rounded-full ${selected ? "bg-ink-inverse/20" : "bg-line"}`}
      >
        <span
          className={`block h-full rounded-full ${selected ? "bg-ink-inverse" : "bg-data-burned"}`}
          style={{
            width: `${largest && country.total ? Math.max(1, (country.total / largest) * 100) : 0}%`,
          }}
        />
      </span>
      {country.area_km2 ? (
        <span
          title={
            country.area_source ? AREA_SOURCES[country.area_source] : undefined
          }
          className="flex items-center justify-between gap-2 border-t border-current/15 pt-2"
        >
          <span
            className={`type-body-sm flex items-center gap-1 ${selected ? "" : "text-ink-muted"}`}
          >
            <MaterialSymbol name="location_on" className="size-4" />
            Território
          </span>
          <span className="type-body-sm tabular-nums">
            {formatArea(country.area_km2)}
            {country.area_source === "cgaz" && "*"}
          </span>
        </span>
      ) : null}
    </button>
  );
}

export function AreaFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const coverageFile = usePipelineFile<CoverageRow>("meta/coverage.csv");
  const countriesFile = usePipelineFile<CountryRow>("meta/countries.csv");
  const outlines = useCountryOutlines();
  const countries = countriesFile.rows;
  const lastDataDate = useMemo(
    () =>
      coverageFile.rows ? readCoverage(coverageFile.rows).lastDataDate : null,
    [coverageFile.rows],
  );
  const lastYear = lastDataDate ? Number(lastDataDate.slice(0, 4)) : null;
  const years = lastYear
    ? Array.from(
        { length: lastYear - CALENDAR_FIRST_YEAR + 1 },
        (_, index) => lastYear - index,
      )
    : [];

  const requestedArea = searchParams.get("area");
  const requestedYear = Number(searchParams.get("year")) || null;
  const [chosenYear, setChosenYear] = useState<number | null>(requestedYear);
  const [chosenArea, setChosenArea] = useState<string | null>(requestedArea);
  const [chosenContinent, setChosenContinent] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const year =
    chosenYear &&
    lastYear &&
    chosenYear >= CALENDAR_FIRST_YEAR &&
    chosenYear <= lastYear
      ? chosenYear
      : lastYear;
  const area =
    countries?.find((country) => country.iso3 === chosenArea) ?? null;
  const continentId = chosenContinent ?? area?.continent ?? null;
  const continent = findContinent(continentId ?? undefined);
  const { column, totals, pending } = useCountryYearTotals(countries, year);
  const boundaryAreas = useMemo(
    () =>
      (countries ?? [])
        .filter((country) => country.area_source === "cgaz")
        .map(countryName)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [countries],
  );
  const unit = column ? TOTAL_UNITS[column] : "focos";

  const choices = useMemo<CountryChoice[]>(
    () =>
      (countries ?? []).map((country) => ({
        ...country,
        label: countryName(country),
        total: totals.get(country.iso3) ?? null,
      })),
    [countries, totals],
  );

  const searchText = SEARCH_FORM(search.trim());
  const listed = (
    searchText
      ? choices.filter((choice) =>
          SEARCH_FORM(choice.label).includes(searchText),
        )
      : choices.filter((choice) => choice.continent === continentId)
  ).sort(
    (a, b) =>
      (b.total ?? -1) - (a.total ?? -1) ||
      a.label.localeCompare(b.label, "pt-BR"),
  );
  const shown =
    showAll || searchText ? listed : listed.slice(0, VISIBLE_COUNTRIES);
  const largest = Math.max(0, ...listed.map((choice) => choice.total ?? 0));

  const continentTotal = (id: string) => {
    const members = choices.filter((choice) => choice.continent === id);
    if (pending > 0 || !column) {
      return null;
    }
    return members.reduce((sum, choice) => sum + (choice.total ?? 0), 0);
  };

  const chooseContinent = (id: string) => {
    setChosenContinent(id);
    setShowAll(false);
    setSearch("");
    if (area && area.continent !== id) {
      setChosenArea(null);
    }
  };

  const clearFilters = () => {
    setChosenYear(null);
    setChosenArea(null);
    setChosenContinent(null);
    setSearch("");
    setShowAll(false);
  };

  const summary = [
    year,
    continent?.name,
    area ? countryName(area) : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-[1328px] px-4 pt-8 pb-24 sm:px-8 lg:px-16 lg:pt-12">
      <FadeUp className="flex flex-col gap-2">
        <p className="type-eyebrow flex items-center gap-2 text-ink-muted">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-data-burned"
          />
          Calendário
        </p>
        <h1 className="type-heading-lg text-ink">Escolha o ano e a região</h1>
        <p className="type-body max-w-[560px] text-ink-muted">
          Comece pelo ano, depois o continente e o país. Você pode mudar tudo no
          mapa.
        </p>
      </FadeUp>

      <section
        aria-labelledby="search-filters-title"
        className="mt-12 flex flex-col gap-8"
      >
        <FadeUp delay={0.08}>
          <h2 id="search-filters-title" className="type-section-title text-ink">
            Filtros de pesquisa
          </h2>
        </FadeUp>

        <FadeUp delay={0.14} className="flex flex-col gap-4">
          <GroupHeader
            step={1}
            title="Ano"
            aside={
              lastYear && lastDataDate
                ? `${CALENDAR_FIRST_YEAR}-${lastYear} · ${lastYear} vai até ${formatDayMonth(lastDataDate)}`
                : undefined
            }
          />
          <div
            role="radiogroup"
            aria-label="Ano"
            className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12"
          >
            {years.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={option === year}
                onClick={() => setChosenYear(option)}
                className={`type-chip h-9 cursor-pointer rounded-sm border transition-[color,background-color,border-color,box-shadow] duration-200 ease-standard ${option === year ? "border-selected bg-selected font-semibold text-ink-inverse shadow-[0_6px_18px_rgba(242,242,242,0.12)] hover:bg-selected-hover" : "border-line bg-surface text-ink hover:border-ink hover:bg-surface-hover"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={0.2} className="flex flex-col gap-4">
          <GroupHeader
            step={2}
            title="Continente"
            aside={year ? `Focos de calor em ${year}` : undefined}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONTINENTS.map((option) => (
              <ContinentCard
                key={option.id}
                continent={option}
                countryCount={
                  choices.filter((choice) => choice.continent === option.id)
                    .length
                }
                total={continentTotal(option.id)}
                unit={unit}
                year={year ?? 0}
                selected={option.id === continentId && !searchText}
                onSelect={() => chooseContinent(option.id)}
              />
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={0.26} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-3">
            <StepTitle step={3} title="País" />
            <label className="relative flex w-full items-center sm:w-64">
              <MaterialSymbol
                name="search"
                className="pointer-events-none absolute left-3 size-[18px] text-ink-muted"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar país"
                aria-label="Buscar país"
                className="type-body-sm h-10 w-full rounded-sm border border-line-strong bg-surface pr-3 pl-9 text-ink transition-colors duration-200 ease-standard placeholder:text-ink-muted hover:border-ink focus:border-ink"
              />
            </label>
          </div>
          {!continentId && !searchText ? (
            <p className="type-body-sm flex items-center gap-2 rounded-md border border-dashed border-line px-4 py-5 text-ink-muted">
              <MaterialSymbol name="info" className="size-[18px] shrink-0" />
              Escolha um continente para ver os países, ou busque pelo nome.
            </p>
          ) : (
            <>
              <p className="type-body-sm text-ink-muted">
                {searchText
                  ? `${listed.length} ${listed.length === 1 ? "país encontrado" : "países encontrados"}`
                  : `${listed.length} países em ${continent?.name ?? ""}`}{" "}
                · ordenados por focos em {year}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {shown.map((choice) => (
                  <CountryCard
                    key={choice.iso3}
                    country={choice}
                    outline={outlines?.[choice.iso3]}
                    largest={largest}
                    year={year ?? 0}
                    selected={choice.iso3 === area?.iso3}
                    onSelect={() => setChosenArea(choice.iso3)}
                  />
                ))}
              </div>
              {shown.length < listed.length && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className={`${buttonClassName({ variant: "secondary", size: "md" })} self-center`}
                >
                  Ver os outros {listed.length - shown.length} países
                  <MaterialSymbol
                    name="keyboard_arrow_down"
                    className="size-[18px]"
                  />
                </button>
              )}
              <p className="type-body-sm text-ink-muted">
                Território: área de terra do Banco Mundial.
                {boundaryAreas.length > 0 &&
                  ` * ${boundaryAreas.join(", ")}: o Banco Mundial não tem a área, então ela vem das fronteiras (CGAZ) e inclui lagos e rios.`}{" "}
                Os focos são os números da pipeline, sem arredondamento além do
                número inteiro.
              </p>
            </>
          )}
        </FadeUp>
      </section>

      <m.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.32, ease: [0.2, 0, 0, 1] }}
        className="sticky bottom-4 z-10 mt-12 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line-strong/60 bg-surface/85 px-5 py-4 shadow-overlay backdrop-blur-md"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span className="type-caption flex items-center gap-2 text-ink-muted">
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${area ? "bg-status-live" : "bg-ink-disabled"}`}
            />
            Sua escolha
          </span>
          <span className="type-heading-sm truncate text-ink">
            {summary.length ? summary.join(" · ") : "Nada escolhido ainda"}
          </span>
        </div>
        <div className="flex w-full gap-3 sm:w-auto">
          <button
            type="button"
            onClick={clearFilters}
            className={`${buttonClassName({ variant: "secondary", size: "md" })} flex-1 sm:flex-none`}
          >
            Limpar filtros
          </button>
          <button
            type="button"
            disabled={!area}
            onClick={() => area && router.push(areaMapHref(area.iso3, year))}
            className={`${buttonClassName({ variant: "primary", size: "md" })} flex-1 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-raised disabled:text-ink-disabled sm:flex-none`}
          >
            Pesquisar
            <MaterialSymbol name="arrow_forward" className="size-[18px]" />
          </button>
        </div>
      </m.div>
    </main>
  );
}
