"use client";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CountryOutline } from "@/country-outlines/country-outlines";
import { HEAT_BACKGROUNDS } from "@/fire-calendar/calendar-cell-style";
import {
  formatCount,
  formatHotspots,
  heatRangeLabel,
  hotspotsWord,
} from "@/fire-calendar/calendar-labels";
import {
  CALENDAR_FIRST_YEAR,
  type CalendarYear,
} from "@/fire-calendar/calendar-matrix";
import { isMeasured, logBreaks } from "@/fire-calendar/calendar-statistics";
import { buttonClassName } from "@/button/button-class-name";
import { localDateFormat, localNumberFormat } from "@/i18n/format";
import { inLocale, localized, tr, useLocale, useTr } from "@/i18n/locale";
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
  andList,
  type LayerRow,
  type MapSensor,
  SENSOR_NAMES,
  SensorPicker,
  sensorCovers,
  sensorFactor,
} from "./sensor-picker";
import {
  type BlockFactors,
  blockId,
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

const CONFIDENCE_LEVELS: Record<string, number> = {
  low: 1,
  l: 1,
  nominal: 2,
  n: 2,
  high: 3,
  h: 3,
};

const CONFIDENCE_TEXTS = localized(
  [
    { level: "Low", detail: "weak signal, may not be a real heat source" },
    { level: "Nominal", detail: "typical heat source signal" },
    { level: "High", detail: "strong heat source signal" },
  ],
  [
    {
      level: "Baixa",
      detail: "sinal fraco, pode não ser uma fonte de calor real",
    },
    { level: "Nominal", detail: "sinal típico de fonte de calor" },
    { level: "Alta", detail: "sinal forte de fonte de calor" },
  ],
);

const PIXEL_SIZES: Record<SeriesLayer, { label: string; size: number }> = {
  modis: { label: "1 km", size: 24 },
  viirs_snpp: { label: "375 m", size: 9 },
  viirs_noaa20: { label: "375 m", size: 9 },
  viirs_noaa21: { label: "375 m", size: 9 },
  landsat: { label: "30 m", size: 2 },
};

const SATELLITE_NAMES: Record<string, string> = {
  N: "Suomi NPP",
  N20: "NOAA-20",
  N21: "NOAA-21",
  L8: "Landsat 8",
  L9: "Landsat 9",
};

const HARMONIZED_LAYERS: Partial<Record<HarmonizedSource, SeriesLayer>> = {
  modis_x_k: "modis",
  viirs_snpp: "viirs_snpp",
  viirs_noaa20_x_k20: "viirs_noaa20",
};

const FACTOR = localNumberFormat({
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

const NO_CELLS: FireCell[] = [];
const NO_POINTS: MappedPoint[] = [];

const LOCAL_TIME = localDateFormat({
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const UTC_TIME = localDateFormat({
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const COORDINATE = localNumberFormat({
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function everyMinute(listener: () => void) {
  const timer = window.setInterval(listener, MINUTE_MS);
  return () => window.clearInterval(timer);
}

function currentMinute(): number {
  return Math.floor(Date.now() / MINUTE_MS);
}

function elapsedLabel(acquiredAt: string, minute: number): string {
  const hours = Math.floor(
    (minute * MINUTE_MS - Date.parse(acquiredAt)) / HOUR_MS,
  );
  if (hours < 1) {
    return tr("less than 1 h ago", "há menos de 1 h");
  }
  if (hours < 48) {
    return tr(`${hours} h ago`, `há ${hours} h`);
  }
  const days = Math.floor(hours / 24);
  return tr(`${days} days ago`, `há ${days} dias`);
}

function sensorPhrase(point: MappedPoint): string {
  if (point.layer === "modis") {
    return tr(
      `MODIS on the ${point.satellite} satellite`,
      `O MODIS do satélite ${point.satellite}`,
    );
  }
  if (point.layer === "landsat") {
    const name = SATELLITE_NAMES[point.satellite] ?? "Landsat";
    return tr(name, `O ${name}`);
  }
  const satellite =
    SATELLITE_NAMES[point.satellite] ?? LAYER_NAMES[point.layer];
  return tr(
    `VIIRS on the ${satellite} satellite`,
    `O VIIRS do satélite ${satellite}`,
  );
}

function TooltipRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="type-body-sm shrink-0 text-ink-muted">{term}</dt>
      <dd className="type-body-sm text-right text-ink tabular-nums">
        {children}
      </dd>
    </div>
  );
}

function ConfidenceMeter({ confidence }: { confidence: string }) {
  const t = useTr();
  const level = CONFIDENCE_LEVELS[confidence];
  if (!level) {
    return null;
  }
  const text = CONFIDENCE_TEXTS[level - 1];
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="meter"
        aria-label={t("Detection confidence", "Confiança da detecção")}
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={level}
        aria-valuetext={`${text.level}: ${text.detail}`}
        className="grid grid-cols-3 gap-1"
      >
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={`h-1.5 rounded-full ${step <= level ? "bg-data-burned" : "bg-line"}`}
          />
        ))}
      </div>
      <p className="type-body-sm text-ink-muted">
        {t(
          `${text.level} confidence: ${text.detail}`,
          `Confiança ${text.level.toLowerCase()}: ${text.detail}`,
        )}
      </p>
    </div>
  );
}

function TooltipFooter({
  pinned,
  href,
  label,
}: {
  pinned: boolean;
  href: string;
  label: string;
}) {
  const t = useTr();
  return pinned ? (
    <a
      href={href}
      className="type-button inline-flex items-center gap-1.5 self-start text-ink hover:underline"
    >
      {label}
      <MaterialSymbol name="arrow_forward" className="size-[18px]" />
    </a>
  ) : (
    <p className="type-caption text-ink-disabled">
      {t("Click to pin", "Clique para fixar")}
    </p>
  );
}

function FireTooltip({
  tooltip,
  pinned,
  areaName,
  cellMonths,
  largestCell,
  harmonized,
  factors,
}: {
  tooltip: MapTooltip;
  pinned: boolean;
  areaName: string;
  cellMonths: string;
  largestCell: number;
  harmonized: boolean;
  factors: BlockFactors | null;
}) {
  const t = useTr();
  const minute = useSyncExternalStore(everyMinute, currentMinute, () => 0);
  if (tooltip.kind === "cell") {
    const { cell } = tooltip;
    const share = largestCell ? cell.count / largestCell : 0;
    return (
      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4 shadow-overlay">
        <p className="type-caption flex items-center gap-2 pr-8 text-ink-muted">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-data-burned"
          />
          {t("0.25° cell · about 28 km", "Célula de 0,25° · cerca de 28 km")}
        </p>
        <p className="type-heading-sm text-ink">
          {harmonized
            ? t(
                `${formatCount(cell.count)} VIIRS-equivalent ${hotspotsWord(cell.count)}`,
                `${formatHotspots(cell.count)} equivalentes VIIRS`,
              )
            : formatHotspots(cell.count)}
        </p>
        <p className="type-body-sm text-ink">
          {t(
            `Sum of all detections in this cell in ${cellMonths}. Each detection is a pixel the satellite saw as hotter than its surroundings.`,
            `Soma de todas as detecções neste quadrado em ${cellMonths}. Cada detecção é um pixel que o satélite viu mais quente que o entorno.`,
          )}
        </p>
        <div className="flex flex-col gap-1.5">
          <span className="block h-1.5 overflow-hidden rounded-full bg-line">
            <span
              className="block h-full rounded-full bg-data-burned"
              style={{ width: `${Math.max(2, Math.round(share * 100))}%` }}
            />
          </span>
          <span className="type-body-sm text-ink-muted">
            {t(
              `${Math.round(share * 100)}% of the hottest cell on the map`,
              `${Math.round(share * 100)}% da célula mais quente do mapa`,
            )}
          </span>
        </div>
        <dl className="flex flex-col gap-1">
          <TooltipRow term={t("Center", "Centro")}>
            {COORDINATE.format(cell.latitude)} ·{" "}
            {COORDINATE.format(cell.longitude)}
          </TooltipRow>
        </dl>
        <TooltipFooter
          pinned={pinned}
          href="/methodology#filtragem"
          label={t("How we count", "Como contamos")}
        />
      </div>
    );
  }
  const { point } = tooltip;
  const acquired = new Date(point.acquiredAt);
  const weight = harmonizedWeight(point, factors);
  const pixel = PIXEL_SIZES[point.layer];
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4 shadow-overlay">
      <p className="type-caption flex items-center gap-2 pr-8 text-ink-muted">
        <span
          aria-hidden="true"
          className={
            point.active
              ? "size-2.5 rounded-full border-[1.5px] border-data-active"
              : "size-2 rounded-full bg-data-burned"
          }
        />
        {point.active
          ? t("Active heat source", "Fonte de calor ativa")
          : t("Hotspot", "Foco de calor")}{" "}
        · {elapsedLabel(point.acquiredAt, minute)}
      </p>
      <p className="type-heading-sm pr-6 text-ink">{areaName}</p>
      <p className="type-body-sm text-ink">
        {t(
          `${sensorPhrase(point)} saw a ${pixel.label} pixel hotter than its surroundings ${point.daynight === "N" ? "during a nighttime overpass" : "during a daytime overpass"}.`,
          `${sensorPhrase(point)} viu um pixel de ${pixel.label} mais quente que o entorno ${point.daynight === "N" ? "numa passagem noturna" : "numa passagem de dia"}.`,
        )}
      </p>
      <ConfidenceMeter confidence={point.confidence} />
      <dl className="flex flex-col gap-1">
        <TooltipRow term={t("Your local time", "No seu horário")}>
          {LOCAL_TIME.format(acquired)}
        </TooltipRow>
        <TooltipRow term={t("UTC", "Em UTC")}>
          {UTC_TIME.format(acquired)}
        </TooltipRow>
        <TooltipRow term="Pixel">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block border border-data-burned bg-data-burned/30"
              style={{
                width: Math.max(2, pixel.size),
                height: Math.max(2, pixel.size),
              }}
            />
            {t(`${pixel.label} per side`, `${pixel.label} de lado`)}
          </span>
        </TooltipRow>
        {weight !== null && (
          <TooltipRow
            term={t("In the harmonized series", "Na série harmonizada")}
          >
            {point.layer === "viirs_snpp"
              ? t("1 hotspot, the reference scale", "1 foco, a régua")
              : t(
                  `${FACTOR.format(weight)} hotspots`,
                  `${FACTOR.format(weight)} focos`,
                )}
          </TooltipRow>
        )}
        <TooltipRow term={t("Data", "Dado")}>
          {point.provisional
            ? t("Preliminary (NRT)", "Provisório (NRT)")
            : t("Final (SP)", "Definitivo (SP)")}
        </TooltipRow>
        <TooltipRow term={t("Coordinates", "Coordenadas")}>
          {COORDINATE.format(point.latitude)} ·{" "}
          {COORDINATE.format(point.longitude)}
        </TooltipRow>
      </dl>
      <TooltipFooter
        pinned={pinned}
        href="/methodology#foco"
        label={t("What is a hotspot?", "O que é um foco?")}
      />
    </div>
  );
}

function sumDays(
  rowsByDate: Map<string, SeriesDayRow>,
  period: MapPeriod,
  columnOf: (date: string) => CellColumn | null,
): number | null {
  let total = 0;
  for (const date of periodDates(period)) {
    const column = columnOf(date);
    const value = column ? rowsByDate.get(date)?.[column] : null;
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
  onPeriodChange: (period: MapPeriod | null) => void;
}) {
  const locale = useLocale();
  const t = useTr();
  const lastDataDate = coverage.lastDataDate!;
  const referenceEnd = yearPeriodEnd(year, lastDataDate);
  const bounds = outline?.bounds ?? null;
  const southern = bounds ? (bounds[1] + bounds[3]) / 2 < 0 : false;
  const points = usesPoints(period, area === null);
  const partialDays = partialDaysLabel(period, coverage.completeDate);
  const [attempt, setAttempt] = useState(0);
  const [count, setCount] = useState<MapCount>("harmonized");
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetButtonRef = useRef<HTMLButtonElement>(null);
  const sheetCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sheetOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);
  const [chosenSensor, setChosenSensor] = useState<MapSensor>("auto");
  const sensor: MapSensor =
    chosenSensor !== "auto" &&
    sensorCovers(coverage.spans.get(chosenSensor), period)
      ? chosenSensor
      : "auto";
  const factorKind = sensor === "auto" ? null : sensorFactor(sensor);
  const canHarmonize = sensor === "auto" || factorKind !== null;
  const harmonized = count === "harmonized" && canHarmonize;
  const layerRows = usePipelineFile<LayerRow>("meta/layers.csv").rows;
  const rowsByDate = useMemo(
    () => new Map((dailyRows ?? []).map((row) => [row.date, row])),
    [dailyRows],
  );
  const autoLayers = useMemo(
    () =>
      periodDates(period).map(
        (date) =>
          HARMONIZED_LAYERS[rowsByDate.get(date)?.harmonized_source ?? ""] ??
          layerForMonth(date.slice(0, 7), coverage),
      ),
    [period, rowsByDate, coverage],
  );
  const pointLayers = useMemo(
    () =>
      sensor === "auto"
        ? autoLayers
        : autoLayers.map((): SeriesLayer => sensor),
    [sensor, autoLayers],
  );
  const cellColumns = useMemo(
    () =>
      periodMonths(period).map((month): CellColumn =>
        sensor !== "auto"
          ? sensor
          : harmonized
            ? "harmonized"
            : layerForMonth(month, coverage),
      ),
    [period, sensor, harmonized, coverage],
  );
  const factorRows = usePipelineFile<FactorRow>("meta/validation.csv").rows;
  const factors = useMemo(
    () => (factorRows ? readBlockFactors(factorRows) : null),
    [factorRows],
  );
  const cellWeight = useMemo(
    () =>
      harmonized && factors && (factorKind === "k" || factorKind === "k20")
        ? (latitude: number, longitude: number) => {
            const block =
              factors.blocks.get(blockId(latitude, longitude)) ?? factors.world;
            return factorKind === "k" ? block.k : block.k20;
          }
        : null,
    [harmonized, factors, factorKind],
  );
  const fires = useMapFires(
    period,
    area,
    bounds,
    coverage,
    points,
    attempt,
    pointLayers,
    cellColumns,
    cellWeight,
    cellWeight ? String(factorKind) : "",
    (period.preset === "24h" || period.preset === "48h") &&
      period.end === lastDataDate
      ? period.preset
      : null,
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
        : inLocale(locale, () =>
            [firstSeasonYear, firstSeasonYear + 1].map((seasonYear) => ({
              year: seasonYear,
              seasons: seasonTotals(
                seasonYear,
                southern,
                calendarYears,
                lastDataDate,
              ),
            })),
          ),
    [area, calendarYears, firstSeasonYear, southern, lastDataDate, locale],
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
  const largestCell = Math.max(0, ...cells.map((cell) => cell.count));
  const cellBreaks = useMemo(
    () => logBreaks(cells.map((cell) => cell.count)),
    [cells],
  );
  const pointsComplete = ready?.mode === "points" && ready.missingDays === 0;
  const dates = periodDates(period);
  const dailyColumn = (date: string): CellColumn | null => {
    if (sensor === "auto") {
      return harmonized ? "harmonized" : pointLayers[dates.indexOf(date)];
    }
    if (!harmonized || factorKind === "one") {
      return sensor;
    }
    return HARMONIZED_LAYERS[rowsByDate.get(date)?.harmonized_source ?? ""] ===
      sensor
      ? "harmonized"
      : null;
  };
  const dailyTotal =
    dailyRows && !period.hours
      ? sumDays(rowsByDate, period, dailyColumn)
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
  const periodCount = period.hours
    ? pointsTotal
    : (dailyTotal ?? (points && harmonized ? pointsTotal : null));
  const countNote =
    periodCount === null &&
    sensor !== "auto" &&
    harmonized &&
    !points &&
    ready !== null
      ? t(
          `The harmonized ${SENSOR_NAMES[sensor]} total is shown for periods of up to 7 days, or when it is the source of the series. Use the Raw count to see this period's total.`,
          `O total harmonizado do ${SENSOR_NAMES[sensor]} sai em períodos de até 7 dias ou quando ele é a fonte da série. Use a contagem Bruta para ver o total deste período.`,
        )
      : null;
  const activeCount = pointsComplete ? ready.activeCount : null;
  const layers = andList([
    ...new Set(
      points
        ? pointLayers.map((layer) => LAYER_NAMES[layer])
        : sensor !== "auto"
          ? [LAYER_NAMES[sensor]]
          : periodMonths(period).map(
              (month) => LAYER_NAMES[layerForMonth(month, coverage)],
            ),
    ),
  ]);
  const cellMonths = ready?.mode === "cells" ? monthsLabel(ready.months) : "";

  const status =
    fires.status === "loading"
      ? t(
          "Loading the hotspots for this period.",
          "Carregando os focos do período.",
        )
      : fires.status === "error"
        ? t(
            "We could not load the hotspots right now.",
            "Não conseguimos carregar os focos agora.",
          )
        : ready?.mode === "points" && ready.missingDays === ready.totalDays
          ? t(
              "The pipeline has not published the daily points for this period yet. Choose more than 7 days to see the monthly grid.",
              "Os pontos diários deste período ainda não foram publicados pela pipeline. Escolha mais de 7 dias para ver a grade mensal.",
            )
          : ready?.mode === "points" && ready.missingDays > 0
            ? t(
                `Points are missing for ${ready.missingDays} ${ready.missingDays === 1 ? "day" : "days"} of this period.`,
                `Faltam os pontos de ${ready.missingDays} ${ready.missingDays === 1 ? "dia" : "dias"} deste período.`,
              )
            : ready?.mode === "cells" &&
                ready.missingMonths === ready.months.length
              ? t(
                  "The pipeline has not published the monthly grid for this period yet.",
                  "A grade mensal deste período ainda não foi publicada pela pipeline.",
                )
              : (ready?.mode === "points" && mappedPoints.length === 0) ||
                  (ready?.mode === "cells" && cells.length === 0)
                ? t(
                    "No hotspots in this period.",
                    "Nenhum foco de calor neste período.",
                  )
                : null;
  const widen =
    ready !== null &&
    status !== null &&
    periodCount === 0 &&
    periodDates(period).length < 30;
  const statusDetail =
    fires.status === "error"
      ? t(
          "The data source did not respond. Your filters are still saved.",
          "A fonte dos dados não respondeu. Seus filtros continuam salvos.",
        )
      : widen
        ? t("Try widening it to 30 days.", "Tente ampliar para 30 dias.")
        : null;

  const closeSheet = () => {
    setSheetOpen(false);
    sheetButtonRef.current?.focus();
  };
  const clearMapFilters = () => {
    setChosenPeriod(null);
    setChosenSensor("auto");
    setCount("harmonized");
  };
  const choosePreset = (preset: Parameters<typeof presetPeriod>[0]) =>
    setChosenPeriod(presetPeriod(preset, referenceEnd));
  const chooseRange = (start: string, end: string) =>
    setChosenPeriod({ start, end, hours: null, preset: null, seasonKey: null });

  return (
    <>
      <button
        ref={sheetButtonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen(true)}
        className="mt-8 flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3 text-left text-ink md:hidden"
      >
        <span className="flex min-w-0 flex-col">
          <span className="type-button">
            {t("Map filters", "Filtros do mapa")}
          </span>
          <span className="type-body-sm truncate text-ink-muted">
            {periodLabel(period)} ·{" "}
            {sensor === "auto"
              ? t("Automatic", "Automático")
              : SENSOR_NAMES[sensor]}{" "}
            · {harmonized ? t("Harmonized", "Harmonizada") : t("Raw", "Bruta")}
          </span>
        </span>
        <MaterialSymbol name="tune" className="size-5 shrink-0" />
      </button>
      <div
        role={sheetOpen ? "dialog" : undefined}
        aria-modal={sheetOpen ? true : undefined}
        aria-label={sheetOpen ? t("Map filters", "Filtros do mapa") : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape" && sheetOpen) {
            closeSheet();
          }
        }}
        className={`${sheetOpen ? "fixed inset-0 z-50 flex flex-col bg-surface-ground/80" : "hidden"} md:static md:z-auto md:flex md:bg-transparent`}
      >
        <div
          className={`${sheetOpen ? "mt-auto max-h-[92dvh] overflow-y-auto rounded-t-lg border-t border-line-strong bg-surface px-4 pt-2 pb-0 shadow-overlay" : ""} md:mt-0 md:max-h-none md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          <div className="sticky top-0 z-10 -mx-4 flex justify-end bg-surface px-2 pt-1 md:hidden">
            <button
              type="button"
              ref={sheetCloseRef}
              aria-label={t("Close filters", "Fechar filtros")}
              onClick={closeSheet}
              className="flex size-11 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-surface-hover"
            >
              <MaterialSymbol name="close" className="size-5" />
            </button>
          </div>
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
            count={harmonized ? "harmonized" : "raw"}
            onCountChange={setCount}
            countLocked={
              canHarmonize
                ? null
                : t(
                    `${SENSOR_NAMES[sensor as SeriesLayer]} has no harmonization factor in the pipeline; each point counts as 1.`,
                    `${SENSOR_NAMES[sensor as SeriesLayer]} não tem fator de harmonização na pipeline; cada ponto vale 1.`,
                  )
            }
            sensorPicker={
              <SensorPicker
                sensor={sensor}
                onSensorChange={setChosenSensor}
                period={period}
                spans={coverage.spans}
                layers={layerRows}
                lastDataDate={lastDataDate}
                factors={factors}
                autoLayers={autoLayers}
              />
            }
          />
          <div className="sticky bottom-0 -mx-4 mt-6 flex gap-3 border-t border-line bg-surface px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={clearMapFilters}
              className={buttonClassName({ variant: "secondary", size: "md" })}
            >
              {t("Clear", "Limpar")}
            </button>
            <button
              type="button"
              onClick={closeSheet}
              className={`${buttonClassName({ variant: "primary", size: "md" })} flex-1`}
            >
              {periodCount === null
                ? t("See on map", "Ver no mapa")
                : t(
                    `See ${formatCount(periodCount)} ${harmonized ? "equivalent " : ""}${hotspotsWord(periodCount)}`,
                    `Ver ${formatCount(periodCount)} ${harmonized ? "focos equivalentes" : hotspotsWord(periodCount)}`,
                  )}
            </button>
          </div>
        </div>
      </div>

      <section aria-labelledby="map-title" className="mt-8">
        <FireMap
          label={t(
            `Hotspot map of ${areaName}, ${periodLabel(period)}`,
            `Mapa de focos de calor de ${areaName}, ${periodLabel(period)}`,
          )}
          area={area}
          bounds={bounds}
          points={mappedPoints}
          cells={cells}
          cellBreaks={cellBreaks}
          renderTooltip={(tooltip, pinned) => (
            <FireTooltip
              tooltip={tooltip}
              pinned={pinned}
              largestCell={largestCell}
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
              {ready?.mode === "cells" &&
                t(
                  ` · monthly map (${cellMonths})`,
                  ` · mapa por mês (${cellMonths})`,
                )}
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
                    {t("Try again", "Tentar de novo")}
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
                    {t("Widen to 30 days", "Ampliar para 30 dias")}
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
            layers={`${harmonized ? t("Harmonized", "Harmonizado") : t("Raw", "Bruto")} · ${layers}`}
            harmonized={harmonized}
            activeCount={activeCount}
            showActive={ready?.mode === "points"}
            cellBreaks={ready?.mode === "cells" ? cellBreaks : null}
            cellMonths={cellMonths}
            country={area !== null}
            countNote={countNote}
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
  countNote,
}: {
  periodCount: number | null;
  layers: string;
  harmonized: boolean;
  activeCount: number | null;
  showActive: boolean;
  cellBreaks: number[] | null;
  cellMonths: string;
  country: boolean;
  countNote: string | null;
}) {
  const t = useTr();
  const [open, setOpen] = useState(
    () => window.matchMedia("(min-width: 768px)").matches,
  );
  return (
    <section
      aria-label={t("Map legend", "Legenda do mapa")}
      className="absolute bottom-4 left-4 z-10 w-[min(20rem,calc(100%-2rem))] rounded-md border border-line bg-surface/95 p-4 shadow-overlay"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="type-caption text-ink-muted">
          {t("Legend", "Legenda")}
        </h3>
        <button
          type="button"
          aria-label={
            open
              ? t("Collapse legend", "Recolher legenda")
              : t("Expand legend", "Abrir legenda")
          }
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
                  {t("Hotspots in the period", "Focos no período")}
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
          {countNote && (
            <p className="text-xs leading-4 text-ink-muted">{countNote}</p>
          )}
          {showActive && (
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-1 size-3 shrink-0 rounded-full border-[1.5px] border-data-active"
                />
                <span className="flex flex-col">
                  <span className="type-body-sm font-semibold text-ink">
                    {t("Active heat source", "Fonte de calor ativa")}
                  </span>
                  <span className="text-xs leading-4 text-ink-muted">
                    {t(
                      "Detected in the last 24 h of the period",
                      "Detectado nas últimas 24 h do período",
                    )}
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
                {t(
                  `${harmonized ? "VIIRS-equivalent hotspots" : "Hotspots"} per 0.25° cell (about 28 km) in ${cellMonths}.`,
                  `${harmonized ? "Focos equivalentes VIIRS" : "Focos"} por célula de 0,25° (cerca de 28 km) em ${cellMonths}.`,
                )}
                {country &&
                  t(
                    " Every cell that touches the country is included, so none of its hotspots is left out. At the border, a cell may bring in hotspots from a neighbor; the total above does not change, because it is counted hotspot by hotspot.",
                    " Entra todo quadrado que toca o país, para nenhum foco dele ficar de fora. Na fronteira, o quadrado pode trazer focos do vizinho; o total acima não muda, porque é contado foco a foco.",
                  )}
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
