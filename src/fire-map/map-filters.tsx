import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { HEAT_BACKGROUNDS } from "@/fire-calendar/calendar-cell-style";
import { formatCompact, formatHotspots } from "@/fire-calendar/calendar-labels";
import { CALENDAR_FIRST_YEAR } from "@/fire-calendar/calendar-matrix";
import { heatLevel } from "@/fire-calendar/calendar-statistics";
import { SegmentedChoice } from "@/fire-calendar/segmented-choice";
import { MaterialSymbol } from "@/icons/material-symbols";
import {
  type MapPeriod,
  PERIOD_PRESETS,
  type PeriodPreset,
  type Season,
} from "./map-period";

export type SeasonTotal = {
  season: Season;
  total: number | null;
  complete: boolean;
  future: boolean;
  current: boolean;
};

const SEASON_COLORS: Record<Season["id"], string> = {
  summer: "text-season-summer bg-season-summer/15",
  autumn: "text-season-autumn bg-season-autumn/20",
  winter: "text-season-winter bg-season-winter/20",
  spring: "text-season-spring bg-season-spring/15",
};

const ROUND_BUTTON_CLASS_NAME =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-surface-raised text-ink transition-colors duration-200 ease-standard hover:border-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-disabled";

const DATE_INPUT_CLASS_NAME =
  "type-chip h-10 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-3 text-ink transition-colors duration-120 ease-standard [color-scheme:dark] hover:border-ink";

function SeasonCard({
  entry,
  largest,
  breaks,
  selected,
  onSelect,
}: {
  entry: SeasonTotal;
  largest: number;
  breaks: number[];
  selected: boolean;
  onSelect: () => void;
}) {
  const { season, total, future, current, complete } = entry;
  const label = `${season.name} ${season.months[2].slice(0, 4)}, ${season.monthsLabel}${current ? ", em andamento" : ""}${total !== null ? `, ${formatHotspots(total)}` : ""}`;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      disabled={future}
      onClick={onSelect}
      title={
        total !== null && !complete
          ? "Soma dos meses com dado. Ainda faltam meses."
          : undefined
      }
      className={`group relative flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-md border p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 ease-standard disabled:cursor-not-allowed disabled:opacity-40 motion-safe:enabled:hover:-translate-y-0.5 ${selected ? "border-ink bg-surface-hover shadow-[0_0_0_1px_var(--color-ink),0_12px_28px_rgba(0,0,0,0.45)]" : "border-line bg-surface hover:border-line-strong hover:bg-surface-hover"}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full ${SEASON_COLORS[season.id]}`}
        >
          <MaterialSymbol name={season.icon} className="size-4" />
        </span>
        {current && (
          <span className="rounded-full bg-ink px-1.5 text-[10px] leading-4 font-semibold tracking-[0.06em] text-ink-inverse uppercase">
            agora
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="type-body-sm font-semibold text-ink">
          {season.name}
        </span>
        <span className="text-xs leading-4 text-ink-muted">
          {season.monthsLabel}
        </span>
      </span>
      <span className="flex items-baseline gap-1">
        <span className="type-data text-ink tabular-nums">
          {total === null ? "-" : formatCompact(total)}
        </span>
        <span className="text-[11px] leading-4 text-ink-muted">focos</span>
      </span>
      <span
        aria-hidden="true"
        className="block h-1.5 overflow-hidden rounded-full bg-line"
      >
        {total !== null && total > 0 && (
          <span
            className={`block h-full rounded-full ${HEAT_BACKGROUNDS[heatLevel(total, breaks) - 1]}`}
            style={{ width: `${Math.max(4, (total / largest) * 100)}%` }}
          />
        )}
      </span>
    </button>
  );
}

export type MapCount = "harmonized" | "raw";

function CountInfo() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOutside = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="inline-flex">
      <button
        type="button"
        aria-label="Os pontos do mapa são harmonizados?"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-120 ease-standard ${open ? "bg-ink text-ink-inverse" : "text-ink-muted hover:bg-surface-hover hover:text-ink"}`}
      >
        <MaterialSymbol name="info" className="size-[18px]" />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Os pontos do mapa são harmonizados?"
          className="absolute top-8 left-0 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 rounded-md border border-line-strong bg-surface-raised p-4 text-left tracking-normal normal-case shadow-overlay"
        >
          <p className="type-heading-sm text-ink">
            Os pontos do mapa são harmonizados?
          </p>
          <p className="type-body-sm text-ink">
            Não. Cada ponto é uma detecção real, do jeito que o satélite viu: um
            pixel mais quente que o entorno.
          </p>
          <p className="type-body-sm text-ink">
            O que é harmonizado é a{" "}
            <strong className="font-semibold">contagem</strong>. O MODIS tem
            pixel de 1 km e enxerga menos focos que o VIIRS, de 375 m. Para
            comparar anos diferentes, cada ponto entra na soma com um peso: o
            fator k do bloco de 5° onde ele caiu.
          </p>
          <p className="type-body-sm text-ink-muted">
            Por isso, na contagem Harmonizada o total pode ser diferente do
            número de pontos desenhados. Na Bruta, cada ponto vale 1.
          </p>
          <a
            href="/methodology#harmonizacao"
            className="type-button inline-flex items-center gap-1.5 self-start text-ink hover:underline"
          >
            Como harmonizamos
            <MaterialSymbol name="arrow_forward" className="size-[18px]" />
          </a>
        </div>
      )}
    </div>
  );
}

const COUNT_OPTIONS: { value: MapCount; label: string }[] = [
  { value: "harmonized", label: "Harmonizada" },
  { value: "raw", label: "Bruta" },
];

export function MapFilters({
  period,
  lastDataDate,
  onPreset,
  onRange,
  seasonYears,
  seasonBreaks,
  southern,
  onSeason,
  onShiftSeasons,
  count,
  onCountChange,
  countLocked,
  sensorPicker,
}: {
  period: MapPeriod;
  lastDataDate: string;
  onPreset: (preset: PeriodPreset) => void;
  onRange: (start: string, end: string) => void;
  seasonYears: { year: number; seasons: SeasonTotal[] }[] | null;
  seasonBreaks: number[];
  southern: boolean;
  onSeason: (season: Season) => void;
  onShiftSeasons: (step: number) => void;
  count: MapCount;
  onCountChange: (count: MapCount) => void;
  countLocked: string | null;
  sensorPicker: ReactNode;
}) {
  const largest = Math.max(
    1,
    ...(seasonYears ?? []).flatMap(({ seasons }) =>
      seasons.map((entry) => entry.total ?? 0),
    ),
  );
  const firstShown = seasonYears?.[0]?.year ?? 0;
  const lastShown = seasonYears?.at(-1)?.year ?? 0;

  return (
    <section
      aria-labelledby="map-filters-title"
      className="flex flex-col gap-8 md:mt-12"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="map-filters-title" className="type-section-title text-ink">
          Filtros do mapa
        </h2>
        <span className="type-body-sm text-ink-muted">
          O mapa atualiza assim que você escolhe
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="type-caption text-[18px] leading-6 tracking-[0.08em] text-ink-muted">
          Período
        </h3>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div
            role="radiogroup"
            aria-label="Período"
            className="flex flex-wrap gap-2"
          >
            {PERIOD_PRESETS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={period.preset === option.value}
                onClick={() => onPreset(option.value)}
                className={`type-chip h-9 cursor-pointer rounded-full border px-4 transition-[color,background-color,border-color] duration-200 ease-standard ${period.preset === option.value ? "border-selected bg-selected font-semibold text-ink-inverse hover:bg-selected-hover" : "border-line bg-surface text-ink hover:border-ink hover:bg-surface-hover"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
              <span className="type-caption text-ink-muted">De</span>
              <input
                type="date"
                value={period.start}
                min={`${CALENDAR_FIRST_YEAR}-01-01`}
                max={period.end}
                onChange={(event) =>
                  event.target.value && onRange(event.target.value, period.end)
                }
                className={DATE_INPUT_CLASS_NAME}
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
              <span className="type-caption text-ink-muted">Até</span>
              <input
                type="date"
                value={period.end}
                min={period.start}
                max={lastDataDate}
                onChange={(event) =>
                  event.target.value &&
                  onRange(period.start, event.target.value)
                }
                className={DATE_INPUT_CLASS_NAME}
              />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="type-caption relative flex items-center gap-1 text-ink-muted">
              Contagem
              <CountInfo />
            </span>
            {countLocked ? (
              <span className="type-chip inline-flex h-10 items-center rounded-sm border border-line px-4 text-ink">
                Bruta
              </span>
            ) : (
              <SegmentedChoice
                label="Contagem do mapa"
                options={COUNT_OPTIONS}
                value={count}
                onChange={onCountChange}
              />
            )}
          </div>
        </div>
        <p className="type-body-sm max-w-3xl text-ink-muted">
          {countLocked
            ? `Bruta: ${countLocked}`
            : count === "harmonized"
              ? "Harmonizada: os números estão em focos equivalentes VIIRS, a régua do calendário. Cada ponto é uma detecção real e vale o fator k do bloco de 5° onde caiu."
              : "Bruta: os números contam as detecções do sensor desenhado, sem conversão. Antes de 2012 o MODIS conta menos focos que o VIIRS, porque o pixel dele é maior."}
        </p>
      </div>

      {sensorPicker}

      {seasonYears && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="type-caption text-[18px] leading-6 tracking-[0.08em] text-ink-muted">
              Estações do ano
            </h3>
            <span className="type-body-sm text-ink-muted">
              Hemisfério {southern ? "sul" : "norte"} · meses inteiros · a barra
              mostra a quantidade de focos ·{" "}
              <span className="whitespace-nowrap">
                <span className="mr-1 rounded-full bg-ink px-1.5 text-[10px] leading-4 text-ink-inverse">
                  agora
                </span>
                em andamento
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-linear-to-b from-surface-hover/50 to-surface p-3 sm:gap-3 sm:p-4">
            <button
              type="button"
              aria-label="Anos anteriores"
              disabled={firstShown <= CALENDAR_FIRST_YEAR}
              onClick={() => onShiftSeasons(-1)}
              className={ROUND_BUTTON_CLASS_NAME}
            >
              <MaterialSymbol name="chevron_left" className="size-5" />
            </button>
            <div className="grid min-w-0 flex-1 gap-5 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-line">
              {seasonYears.map(({ year, seasons }) => (
                <div
                  key={year}
                  className="flex min-w-0 flex-col gap-3 lg:px-4 lg:first:pl-0 lg:last:pr-0"
                >
                  <span className="flex items-center gap-3">
                    <span className="type-chip rounded-full border border-line-strong px-2.5 text-ink tabular-nums">
                      {year}
                    </span>
                    <span aria-hidden="true" className="h-px flex-1 bg-line" />
                  </span>
                  <div
                    role="group"
                    aria-label={`Estações de ${year}`}
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                  >
                    {seasons.map((entry) => (
                      <SeasonCard
                        key={entry.season.key}
                        entry={entry}
                        largest={largest}
                        breaks={seasonBreaks}
                        selected={period.seasonKey === entry.season.key}
                        onSelect={() => onSeason(entry.season)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="Próximos anos"
              disabled={lastShown >= Number(lastDataDate.slice(0, 4))}
              onClick={() => onShiftSeasons(1)}
              className={ROUND_BUTTON_CLASS_NAME}
            >
              <MaterialSymbol name="chevron_right" className="size-5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
