"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { buttonClassName } from "@/button/button-class-name";
import {
  approximateArea,
  type CountryOutline,
  useCountryOutlines,
} from "@/country-outlines/country-outlines";
import { formatCount, formatDayMonth } from "@/fire-calendar/calendar-labels";
import { CALENDAR_FIRST_YEAR } from "@/fire-calendar/calendar-matrix";
import { MaterialSymbol } from "@/icons/material-symbols";
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

const SEARCH_FORM = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function GroupHeader({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h3 className="type-caption text-[18px] leading-6 tracking-[0.08em] text-ink-muted">
        {title}
      </h3>
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
      className={`flex cursor-pointer flex-col gap-2 rounded-md border p-4 text-left transition-colors duration-120 ease-standard ${selected ? "border-selected bg-selected text-ink-inverse hover:bg-selected-hover" : "border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-hover"}`}
    >
      <span
        className={`type-eyebrow flex items-center gap-2 ${selected ? "" : "text-ink-muted"}`}
      >
        <MaterialSymbol name={continent.icon} className="size-[18px]" />
        {continent.name}
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
      className={`flex cursor-pointer flex-col gap-3 rounded-md border p-4 text-left transition-colors duration-120 ease-standard ${selected ? "border-selected bg-selected text-ink-inverse hover:bg-selected-hover" : "border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-hover"}`}
    >
      <span
        className={`type-eyebrow truncate ${selected ? "" : "text-ink-muted"}`}
      >
        {country.label}
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
      {outline && (
        <span className="flex items-center justify-between gap-2 border-t border-current/15 pt-2">
          <span
            className={`type-body-sm flex items-center gap-1 ${selected ? "" : "text-ink-muted"}`}
          >
            <MaterialSymbol name="location_on" className="size-4" />
            Território
          </span>
          <span className="type-body-sm tabular-nums">
            {approximateArea(outline.areaKm2)}
          </span>
        </span>
      )}
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
      <header className="flex flex-col gap-2">
        <p className="type-eyebrow text-ink-muted">Calendário</p>
        <h1 className="type-heading-lg text-ink">Escolha o ano e a região</h1>
        <p className="type-body text-ink-muted">
          Comece pelo ano, depois o continente e o país. Você pode mudar tudo no
          mapa.
        </p>
      </header>

      <section
        aria-labelledby="search-filters-title"
        className="mt-12 flex flex-col gap-8"
      >
        <h2 id="search-filters-title" className="type-section-title text-ink">
          Filtros de pesquisa
        </h2>

        <div className="flex flex-col gap-4">
          <GroupHeader
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
                className={`type-chip h-8 cursor-pointer rounded-sm border transition-colors duration-120 ease-standard ${option === year ? "border-selected bg-selected font-semibold text-ink-inverse hover:bg-selected-hover" : "border-line-strong bg-surface text-ink hover:bg-surface-hover"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <GroupHeader
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
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="type-caption text-[18px] leading-6 tracking-[0.08em] text-ink-muted">
              País
            </h3>
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
                className="type-body-sm h-10 w-full rounded-sm border border-line-strong bg-surface pr-3 pl-9 text-ink placeholder:text-ink-muted"
              />
            </label>
          </div>
          {!continentId && !searchText ? (
            <p className="type-body-sm flex items-center gap-2 text-ink-muted">
              <MaterialSymbol name="info" className="size-[18px]" />
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
                Território: área aproximada, calculada da fronteira do Natural
                Earth 1:50m. Os focos são os números da pipeline, sem
                arredondamento além do número inteiro.
              </p>
            </>
          )}
        </div>
      </section>

      <div className="sticky bottom-4 z-10 mt-12 flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-surface px-5 py-4 shadow-overlay">
        <div className="flex flex-col gap-1">
          <span className="type-caption text-ink-muted">Sua escolha</span>
          <span className="type-heading-sm text-ink">
            {summary.length ? summary.join(" · ") : "Nada escolhido ainda"}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={clearFilters}
            className={buttonClassName({ variant: "secondary", size: "md" })}
          >
            Limpar filtros
          </button>
          <button
            type="button"
            disabled={!area}
            onClick={() => area && router.push(areaMapHref(area.iso3, year))}
            className={`${buttonClassName({ variant: "primary", size: "md" })} disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-raised disabled:text-ink-disabled`}
          >
            Pesquisar
            <MaterialSymbol name="arrow_forward" className="size-[18px]" />
          </button>
        </div>
      </div>
    </main>
  );
}
