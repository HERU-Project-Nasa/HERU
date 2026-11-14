import { HEAT_BACKGROUNDS } from "@/fire-calendar/calendar-cell-style";
import { formatCount } from "@/fire-calendar/calendar-labels";
import { CALENDAR_FIRST_YEAR } from "@/fire-calendar/calendar-matrix";
import { heatLevel } from "@/fire-calendar/calendar-statistics";
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
  summer: "text-season-summer",
  autumn: "text-season-autumn",
  winter: "text-season-winter",
  spring: "text-season-spring",
};

const DATE_INPUT_CLASS_NAME =
  "type-chip h-10 rounded-sm border border-line-strong bg-surface px-3 text-ink [color-scheme:dark]";

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
  const label = `${season.name} ${season.months[2].slice(0, 4)}, ${season.monthsLabel}${current ? ", em andamento" : ""}${total !== null ? `, ${formatCount(total)} focos` : ""}`;
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
      className={`relative flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-sm border p-2.5 text-left transition-colors duration-120 ease-standard disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-ink bg-surface-hover" : "border-line bg-surface hover:border-line-strong hover:bg-surface-hover"}`}
    >
      <span className="type-body-sm flex items-center gap-1.5 font-semibold text-ink">
        <MaterialSymbol
          name={season.icon}
          className={`size-4 shrink-0 ${SEASON_COLORS[season.id]}`}
        />
        {season.name}
      </span>
      <span className="text-xs leading-4 text-ink-muted">
        {season.monthsLabel}
      </span>
      <span aria-hidden="true" className="block h-1 rounded-full bg-line">
        {total !== null && total > 0 && (
          <span
            className={`block h-full rounded-full ${HEAT_BACKGROUNDS[heatLevel(total, breaks) - 1]}`}
            style={{ width: `${Math.max(4, (total / largest) * 100)}%` }}
          />
        )}
      </span>
      {current && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-ink"
        />
      )}
    </button>
  );
}

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
      className="mt-12 flex flex-col gap-8"
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
                className={`type-chip h-8 cursor-pointer rounded-sm border px-3 transition-colors duration-120 ease-standard ${period.preset === option.value ? "border-selected bg-selected font-semibold text-ink-inverse hover:bg-selected-hover" : "border-line-strong bg-surface text-ink hover:bg-surface-hover"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1.5">
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
            <label className="flex flex-col gap-1.5">
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
        </div>
      </div>

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
                <span
                  aria-hidden="true"
                  className="mr-1.5 inline-block size-1.5 rounded-full bg-ink align-middle"
                />
                em andamento
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Anos anteriores"
              disabled={firstShown <= CALENDAR_FIRST_YEAR}
              onClick={() => onShiftSeasons(-1)}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-line-strong bg-surface-raised text-ink disabled:cursor-not-allowed disabled:text-ink-disabled"
            >
              <MaterialSymbol name="chevron_left" className="size-5" />
            </button>
            <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-2">
              {seasonYears.map(({ year, seasons }) => (
                <div key={year} className="flex min-w-0 flex-col gap-2">
                  <span className="type-caption text-ink-muted">{year}</span>
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
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-line-strong bg-surface-raised text-ink disabled:cursor-not-allowed disabled:text-ink-disabled"
            >
              <MaterialSymbol name="chevron_right" className="size-5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
