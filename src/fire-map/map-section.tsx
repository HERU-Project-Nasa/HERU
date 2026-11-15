"use client";

import { type ReactNode, useMemo, useState } from "react";
import type { CountryOutline } from "@/country-outlines/country-outlines";
import { HEAT_BACKGROUNDS } from "@/fire-calendar/calendar-cell-style";
import {
  formatCount,
  formatHotspots,
  heatRangeLabel,
} from "@/fire-calendar/calendar-labels";
import {
  CALENDAR_FIRST_YEAR,
  type CalendarYear,
} from "@/fire-calendar/calendar-matrix";
import { isMeasured, logBreaks } from "@/fire-calendar/calendar-statistics";
import { buttonClassName } from "@/button/button-class-name";
import { MaterialSymbol } from "@/icons/material-symbols";
import type { PipelineCoverage } from "@/pipeline/pipeline-coverage";
import { usePipelineFile } from "@/pipeline/pipeline-files";
import type {
  HarmonizedSource,
  SeriesDayRow,
  SeriesLayer,
} from "@/pipeline/series-row";
import { FireMap, type MapTooltip } from "./fire-map";
import { type MapCount, MapFilters, type SeasonTotal } from "./map-filters";
import {
  layerForMonth,
  type MapPeriod,
  monthsLabel,
  periodDates,
  periodLabel,
  periodMonths,
  partialDaysLabel,
  presetPeriod,
  seasonPeriod,
  seasonsOf,
  usesPoints,
  yearPeriodEnd,
} from "./map-period";
import {
  type BlockFactors,
  type CellColumn,
  type FactorRow,
  type FireCell,
  harmonizedWeight,
  readBlockFactors,
} from "./period-fires";
import { type MappedPoint, useMapFires } from "./use-map-fires";

const LAYER_NAMES: Record<SeriesLayer, string> = {
  modis: "MODIS",
  viirs_snpp: "VIIRS S-NPP",
  viirs_noaa20: "VIIRS NOAA-20",
  viirs_noaa21: "VIIRS NOAA-21",
  landsat: "Landsat",
};

const CONFIDENCE_NAMES: Record<string, string> = {
  low: "Baixa",
  l: "Baixa",
  nominal: "Nominal",
  n: "Nominal",
  high: "Alta",
  h: "Alta",
};

const HARMONIZED_LAYERS: Partial<Record<HarmonizedSource, SeriesLayer>> = {
  modis_x_k: "modis",
  viirs_snpp: "viirs_snpp",
  viirs_noaa20_x_k20: "viirs_noaa20",
};

const FACTOR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NO_CELLS: FireCell[] = [];
const NO_POINTS: MappedPoint[] = [];

const DETECTED_AT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "UTC",
});

const COORDINATE = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function TooltipRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="type-body-sm text-ink-muted">{term}</dt>
      <dd className="type-body-sm text-right text-ink tabular-nums">
        {children}
      </dd>
    </div>
  );
}

function FireTooltip({
  tooltip,
  areaName,
  cellMonths,
  harmonized,
  factors,
}: {
  tooltip: MapTooltip;
  areaName: string;
  cellMonths: string;
  harmonized: boolean;
  factors: BlockFactors | null;
}) {
  const weight =
    tooltip.kind === "point" ? harmonizedWeight(tooltip.point, factors) : null;
  const coordinates =
    tooltip.kind === "point"
      ? [tooltip.point.latitude, tooltip.point.longitude]
      : [tooltip.cell.latitude, tooltip.cell.longitude];
  return (
    <div className="w-66 rounded-sm bg-surface-raised p-3 shadow-overlay">
      <p className="type-caption mb-1 flex items-center gap-2 text-ink-muted">
        <span
          aria-hidden="true"
          className={
            tooltip.kind === "point" && tooltip.point.active
              ? "size-2.5 rounded-full border-[1.5px] border-data-active"
              : "size-2 rounded-full bg-data-burned"
          }
        />
        {tooltip.kind === "cell"
          ? "Célula de 0,25°"
          : tooltip.point.active
            ? "Fogo ativo"
            : "Foco no período"}
      </p>
      <p className="type-heading-sm mb-2 text-ink">
        {tooltip.kind === "cell"
          ? `${formatHotspots(tooltip.cell.count)}${harmonized ? " equivalentes VIIRS" : ""}`
          : areaName}
      </p>
      <dl className="flex flex-col gap-1">
        {tooltip.kind === "point" ? (
          <>
            <TooltipRow term="Detectado">
              {DETECTED_AT.format(new Date(tooltip.point.acquiredAt))} UTC
            </TooltipRow>
            <TooltipRow term="Sensor">
              {LAYER_NAMES[tooltip.point.layer]}
              {tooltip.point.layer === "modis"
                ? ` · ${tooltip.point.satellite}`
                : ""}
            </TooltipRow>
            <TooltipRow term="Confiança">
              {CONFIDENCE_NAMES[tooltip.point.confidence] ??
                tooltip.point.confidence}
            </TooltipRow>
            <TooltipRow term="Passagem">
              {tooltip.point.daynight === "N" ? "Noite" : "Dia"}
            </TooltipRow>
            <TooltipRow term="Dado">
              {tooltip.point.provisional
                ? "Provisório (NRT)"
                : "Definitivo (SP)"}
            </TooltipRow>
            {weight !== null && (
              <TooltipRow term="Na série harmonizada">
                {tooltip.point.layer === "viirs_snpp"
                  ? "1 foco, a régua"
                  : `${FACTOR.format(weight)} focos`}
              </TooltipRow>
            )}
          </>
        ) : (
          <TooltipRow term="Meses">{cellMonths}</TooltipRow>
        )}
        <TooltipRow term="Coordenadas">
          {COORDINATE.format(coordinates[0])} ·{" "}
          {COORDINATE.format(coordinates[1])}
        </TooltipRow>
      </dl>
    </div>
  );
}

function sumDays(
  rowsByDate: Map<string, SeriesDayRow>,
  period: MapPeriod,
  columnOf: (date: string) => CellColumn,
): number | null {
  let total = 0;
  for (const date of periodDates(period)) {
    const value = rowsByDate.get(date)?.[columnOf(date)];
    if (value === null || value === undefined) {
      return null;
    }
    total += value;
  }
  return total;
}

function seasonTotals(
  year: number,
  southern: boolean,
  calendarYears: CalendarYear[],
  lastDataDate: string,
): SeasonTotal[] {
  const cellsByKey = new Map(
    calendarYears.flatMap((calendarYear) =>
      calendarYear.cells.map((cell) => [cell.key, cell] as const),
    ),
  );
  const lastMonth = lastDataDate.slice(0, 7);
  return seasonsOf(year, southern).map((season) => {
    const cells = season.months.map((month) => cellsByKey.get(month));
    const measured = cells.filter((cell) => cell && isMeasured(cell));
    return {
      season,
      total: measured.length
        ? measured.reduce((sum, cell) => sum + cell!.value!, 0)
        : null,
      complete: measured.length === season.months.length,
      future: season.months[0] > lastMonth,
      current: season.months.includes(lastMonth),
    };
  });
}

export function MapSection({
  area,
  areaName,
  year,
  outline,
  coverage,
  dailyRows,
  calendarYears,
  period,
  onPeriodChange: setChosenPeriod,
}: {
  area: string | null;
  areaName: string;
  year: number;
  outline: CountryOutline | null;
  coverage: PipelineCoverage;
  dailyRows: SeriesDayRow[] | null;
  calendarYears: CalendarYear[];
  period: MapPeriod;
  onPeriodChange: (period: MapPeriod) => void;
}) {
  const lastDataDate = coverage.lastDataDate!;
  const referenceEnd = yearPeriodEnd(year, lastDataDate);
  const bounds = outline?.bounds ?? null;
  const southern = bounds ? (bounds[1] + bounds[3]) / 2 < 0 : false;
  const points = usesPoints(period, area === null);
  const partialDays = partialDaysLabel(period, coverage.completeDate);
  const [attempt, setAttempt] = useState(0);
  const [count, setCount] = useState<MapCount>("harmonized");
  const harmonized = count === "harmonized";
  const rowsByDate = useMemo(
    () => new Map((dailyRows ?? []).map((row) => [row.date, row])),
    [dailyRows],
  );
  const pointLayers = useMemo(
    () =>
      periodDates(period).map(
        (date) =>
          HARMONIZED_LAYERS[rowsByDate.get(date)?.harmonized_source ?? ""] ??
          layerForMonth(date.slice(0, 7), coverage),
      ),
    [period, rowsByDate, coverage],
  );
  const factorRows = usePipelineFile<FactorRow>("meta/validation.csv").rows;
  const factors = useMemo(
    () => (factorRows ? readBlockFactors(factorRows) : null),
    [factorRows],
  );
  const fires = useMapFires(
    period,
    area,
    bounds,
    coverage,
    points,
    attempt,
    harmonized,
    pointLayers,
  );
  const [seasonShift, setSeasonShift] = useState(0);
  const lastYear = Number(lastDataDate.slice(0, 4));
  const firstSeasonYear = Math.min(
    Math.max(CALENDAR_FIRST_YEAR, year - 1 + seasonShift),
    lastYear - 1,
  );

  const seasonYears = useMemo(
    () =>
      area === null || calendarYears.length === 0
        ? null
        : [firstSeasonYear, firstSeasonYear + 1].map((seasonYear) => ({
            year: seasonYear,
            seasons: seasonTotals(
              seasonYear,
              southern,
              calendarYears,
              lastDataDate,
            ),
          })),
    [area, calendarYears, firstSeasonYear, southern, lastDataDate],
  );
  const seasonBreaks = useMemo(
    () =>
      logBreaks(
        (seasonYears ?? []).flatMap(({ seasons }) =>
          seasons.map((entry) => entry.total ?? 0),
        ),
      ),
    [seasonYears],
  );

  const ready = fires.status === "ready" ? fires : null;
  const cells = ready?.mode === "cells" ? ready.cells : NO_CELLS;
  const mappedPoints = ready?.mode === "points" ? ready.points : NO_POINTS;
  const cellBreaks = useMemo(
    () => logBreaks(cells.map((cell) => cell.count)),
    [cells],
  );
  const pointsComplete = ready?.mode === "points" && ready.missingDays === 0;
  const dates = periodDates(period);
  const dailyTotal =
    dailyRows && !period.hours
      ? sumDays(rowsByDate, period, (date) =>
          harmonized ? "harmonized" : pointLayers[dates.indexOf(date)],
        )
      : null;
  const weights = harmonized
    ? mappedPoints.map((point) => harmonizedWeight(point, factors))
    : null;
  const pointsTotal = !pointsComplete
    ? null
    : !weights
      ? mappedPoints.length
      : weights.every((weight) => weight !== null)
        ? weights.reduce<number>((sum, weight) => sum + weight!, 0)
        : null;
  const periodCount = period.hours ? pointsTotal : dailyTotal;
  const activeCount = pointsComplete ? ready.activeCount : null;
  const layers = [
    ...new Set(
      points
        ? pointLayers.map((layer) => LAYER_NAMES[layer])
        : periodMonths(period).map(
            (month) => LAYER_NAMES[layerForMonth(month, coverage)],
          ),
    ),
  ].join(" e ");
  const cellMonths = ready?.mode === "cells" ? monthsLabel(ready.months) : "";

  const status =
    fires.status === "loading"
      ? "Carregando os focos do período."
      : fires.status === "error"
        ? "Não conseguimos carregar os focos agora."
        : ready?.mode === "points" && ready.missingDays === ready.totalDays
          ? "Os pontos diários deste período ainda não foram publicados pela pipeline. Escolha mais de 7 dias para ver a grade mensal."
          : ready?.mode === "points" && ready.missingDays > 0
            ? `Faltam os pontos de ${ready.missingDays} ${ready.missingDays === 1 ? "dia" : "dias"} deste período.`
            : ready?.mode === "cells" &&
                ready.missingMonths === ready.months.length
              ? "A grade mensal deste período ainda não foi publicada pela pipeline."
              : (ready?.mode === "points" && mappedPoints.length === 0) ||
                  (ready?.mode === "cells" && cells.length === 0)
                ? "Nenhum foco de calor neste período."
                : null;
  const widen =
    ready !== null &&
    status !== null &&
    periodCount === 0 &&
    periodDates(period).length < 30;
  const statusDetail =
    fires.status === "error"
      ? "A fonte dos dados não respondeu. Seus filtros continuam salvos."
      : widen
        ? "Tente ampliar para 30 dias."
        : null;

  const choosePreset = (preset: Parameters<typeof presetPeriod>[0]) =>
    setChosenPeriod(presetPeriod(preset, referenceEnd));
  const chooseRange = (start: string, end: string) =>
    setChosenPeriod({ start, end, hours: null, preset: null, seasonKey: null });

  return (
    <>
      <MapFilters
        period={period}
        lastDataDate={lastDataDate}
        onPreset={choosePreset}
        onRange={chooseRange}
        seasonYears={seasonYears}
        seasonBreaks={seasonBreaks}
        southern={southern}
        onSeason={(season) =>
          setChosenPeriod(seasonPeriod(season, lastDataDate))
        }
        onShiftSeasons={(step) => setSeasonShift(seasonShift + step)}
        count={count}
        onCountChange={setCount}
      />

      <section aria-labelledby="map-title" className="mt-8">
        <FireMap
          label={`Mapa de focos de calor de ${areaName}, ${periodLabel(period)}`}
          area={area}
          bounds={bounds}
          points={mappedPoints}
          cells={cells}
          cellBreaks={cellBreaks}
          renderTooltip={(tooltip) => (
            <FireTooltip
              tooltip={tooltip}
              areaName={areaName}
              cellMonths={cellMonths}
              harmonized={harmonized}
              factors={factors}
            />
          )}
        >
          <div className="pointer-events-none absolute top-4 left-4 z-10 flex max-w-[calc(100%-6rem)] flex-col gap-1">
            <h2 id="map-title" className="type-heading-md text-ink">
              {areaName}
            </h2>
            <p className="type-caption text-ink-muted">
              {periodLabel(period)}
              {partialDays && ` · ${partialDays}`}
              {ready?.mode === "cells" && ` · mapa por mês (${cellMonths})`}
            </p>
            {status && (
              <div
                role={fires.status === "error" ? "alert" : "status"}
                className="type-body-sm pointer-events-auto mt-2 flex max-w-sm flex-col items-start gap-2 rounded-sm bg-surface-raised/90 px-3 py-2 text-ink"
              >
                <p className="flex items-start gap-2">
                  <MaterialSymbol
                    name={
                      fires.status === "loading"
                        ? "progress_activity"
                        : fires.status === "error"
                          ? "error"
                          : "info"
                    }
                    className={`mt-0.5 size-4 shrink-0 ${fires.status === "loading" ? "animate-spin" : fires.status === "error" ? "text-alert" : ""}`}
                  />
                  {status}
                </p>
                {statusDetail && (
                  <p className="text-ink-muted">{statusDetail}</p>
                )}
                {fires.status === "error" && (
                  <button
                    type="button"
                    onClick={() => setAttempt(attempt + 1)}
                    className={buttonClassName({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    <MaterialSymbol name="refresh" className="size-[18px]" />
                    Tentar de novo
                  </button>
                )}
                {widen && (
                  <button
                    type="button"
                    onClick={() => choosePreset("30d")}
                    className={buttonClassName({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Ampliar para 30 dias
                    <MaterialSymbol
                      name="arrow_forward"
                      className="size-[18px]"
                    />
                  </button>
                )}
              </div>
            )}
          </div>
          <MapLegend
            periodCount={periodCount}
            layers={`${harmonized ? "Harmonizado" : "Bruto"} · ${layers}`}
            harmonized={harmonized}
            activeCount={activeCount}
            showActive={ready?.mode === "points"}
            cellBreaks={ready?.mode === "cells" ? cellBreaks : null}
            cellMonths={cellMonths}
            country={area !== null}
          />
        </FireMap>
      </section>
    </>
  );
}

function MapLegend({
  periodCount,
  layers,
  harmonized,
  activeCount,
  showActive,
  cellBreaks,
  cellMonths,
  country,
}: {
  periodCount: number | null;
  layers: string;
  harmonized: boolean;
  activeCount: number | null;
  showActive: boolean;
  cellBreaks: number[] | null;
  cellMonths: string;
  country: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section
      aria-label="Legenda do mapa"
      className="absolute bottom-4 left-4 z-10 w-[min(20rem,calc(100%-2rem))] rounded-md border border-line bg-surface/95 p-4 shadow-overlay"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="type-caption text-ink-muted">Legenda</h3>
        <button
          type="button"
          aria-label={open ? "Recolher legenda" : "Abrir legenda"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-surface-hover"
        >
          <MaterialSymbol
            name={open ? "keyboard_arrow_down" : "keyboard_arrow_up"}
            className="size-5"
          />
        </button>
      </div>
      {open && (
        <dl className="mt-2 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-data-burned"
              />
              <span className="flex flex-col">
                <span className="type-body-sm font-semibold text-ink">
                  Focos no período
                </span>
                <span className="text-xs leading-4 text-ink-muted">
                  {layers}
                </span>
              </span>
            </dt>
            <dd className="type-data text-ink">
              {periodCount === null ? "-" : formatCount(periodCount)}
            </dd>
          </div>
          {showActive && (
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-1 size-3 shrink-0 rounded-full border-[1.5px] border-data-active"
                />
                <span className="flex flex-col">
                  <span className="type-body-sm font-semibold text-ink">
                    Fogo ativo
                  </span>
                  <span className="text-xs leading-4 text-ink-muted">
                    Detectado nas últimas 24 h do período
                  </span>
                </span>
              </dt>
              <dd className="type-data text-ink">
                {activeCount === null ? "-" : formatCount(activeCount)}
              </dd>
            </div>
          )}
          {cellBreaks && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs leading-4 text-ink-muted">
                {harmonized ? "Focos equivalentes VIIRS" : "Focos"} por célula
                de 0,25° em {cellMonths}.
                {country &&
                  " Células na fronteira podem somar focos do país vizinho."}
              </span>
              <span className="grid grid-cols-6 gap-1">
                {(cellBreaks.length === 0 ? [4] : [1, 2, 3, 4, 5, 6]).map(
                  (level) => (
                    <span key={level} className="flex min-w-0 flex-col gap-1">
                      <span
                        className={`block h-2 rounded-xs ${HEAT_BACKGROUNDS[level - 1]}`}
                      />
                      <span className="truncate text-[10px] leading-3 text-ink-muted tabular-nums">
                        {cellBreaks.length === 0
                          ? "> 0"
                          : heatRangeLabel(
                              level === 1 ? null : cellBreaks[level - 2],
                              level === 6 ? null : cellBreaks[level - 1],
                            )}
                      </span>
                    </span>
                  ),
                )}
              </span>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
