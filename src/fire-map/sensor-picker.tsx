import { formatFullDate } from "@/fire-calendar/calendar-labels";
import { localNumberFormat } from "@/i18n/format";
import { tr, useTr } from "@/i18n/locale";
import type { LayerSpan } from "@/pipeline/pipeline-coverage";
import type { SeriesLayer } from "@/pipeline/series-row";
import type { MapPeriod } from "./map-period";
import type { BlockFactors } from "./period-fires";

export type MapSensor = "auto" | SeriesLayer;

export type LayerRow = {
  layer: string;
  title: string;
  instrument: string;
  resolution_m: string;
  satellites: string;
  notes: string;
};

export const SENSOR_NAMES: Record<SeriesLayer, string> = {
  modis: "MODIS",
  viirs_snpp: "VIIRS S-NPP",
  viirs_noaa20: "VIIRS NOAA-20",
  viirs_noaa21: "VIIRS NOAA-21",
  landsat: "Landsat",
};

const SENSOR_ORDER: SeriesLayer[] = [
  "modis",
  "viirs_snpp",
  "viirs_noaa20",
  "viirs_noaa21",
  "landsat",
];

const SATELLITE_NAMES: Record<string, string> = {
  Terra: "Terra",
  Aqua: "Aqua",
  N: "Suomi NPP",
  N20: "NOAA-20",
  N21: "NOAA-21",
  L8: "Landsat 8",
  L9: "Landsat 9",
};

const FACTOR = localNumberFormat({
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const METERS = localNumberFormat();

/** "A and B" or "A, B, and C" in English; "A e B e C" in Portuguese. */
export function andList(names: string[]): string {
  return tr(
    names.length > 2
      ? `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`
      : names.join(" and "),
    names.join(" e "),
  );
}

export function sensorFactor(layer: SeriesLayer): "k" | "k20" | "one" | null {
  return layer === "modis"
    ? "k"
    : layer === "viirs_noaa20"
      ? "k20"
      : layer === "viirs_snpp"
        ? "one"
        : null;
}

export function sensorCovers(
  span: LayerSpan | undefined,
  period: MapPeriod,
): boolean {
  return (
    span !== undefined && span.first <= period.end && span.last >= period.start
  );
}

function readableNote(note: string): string {
  return note.replace(/\d{4}-\d{2}-\d{2}/g, (date) => formatFullDate(date));
}

function satelliteNames(satellites: string): string[] {
  return satellites
    .split(";")
    .filter(Boolean)
    .map((code) => SATELLITE_NAMES[code] ?? code);
}

function satelliteList(names: string[]): string {
  return names.length > 1
    ? tr(
        `${names.slice(0, -1).join(", ")}${names.length > 2 ? "," : ""} and ${names.at(-1)}`,
        `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`,
      )
    : (names[0] ?? "");
}

function pixelLabel(row: LayerRow | undefined): string | null {
  return row?.resolution_m
    ? `${METERS.format(Number(row.resolution_m))} m`
    : null;
}

function factorTag(layer: SeriesLayer, factors: BlockFactors | null): string {
  const factor = sensorFactor(layer);
  if (factor === "one") {
    return tr("reference scale", "régua da série");
  }
  if (factor === null) {
    return tr("no factor", "sem fator");
  }
  if (!factors) {
    return factor === "k" ? "× k" : "× k20";
  }
  return `× ${factor} ${FACTOR.format(factor === "k" ? factors.world.k : factors.world.k20)}`;
}

function sensorExplanation(
  layer: SeriesLayer,
  row: LayerRow | undefined,
  span: LayerSpan | undefined,
  lastDataDate: string,
  factors: BlockFactors | null,
): string {
  const names = row ? satelliteNames(row.satellites) : [];
  const satellites = satelliteList(names);
  const instrument = row?.instrument ?? SENSOR_NAMES[layer];
  const pixel = pixelLabel(row);
  const dates = span
    ? span.last < lastDataDate
      ? tr(
          `from ${formatFullDate(span.first)} to ${formatFullDate(span.last)}`,
          `de ${formatFullDate(span.first)} a ${formatFullDate(span.last)}`,
        )
      : tr(
          `since ${formatFullDate(span.first)}`,
          `desde ${formatFullDate(span.first)}`,
        )
    : null;
  const opening = tr(
    `${instrument} instrument${satellites ? ` on the ${satellites} ${names.length > 1 ? "satellites" : "satellite"}` : ""}${pixel ? `, ${pixel} pixel` : ""}${dates ? `, data ${dates}` : ""}.`,
    `Instrumento ${instrument}${satellites ? ` ${names.length > 1 ? "nos satélites" : "no satélite"} ${satellites}` : ""}${pixel ? `, pixel de ${pixel}` : ""}${dates ? `, dados ${dates}` : ""}.`,
  );
  const note = row?.notes
    ? ` ${readableNote(row.notes)[0].toUpperCase()}${readableNote(row.notes).slice(1)}.`
    : "";
  const factor = sensorFactor(layer);
  const counting =
    factor === "one"
      ? tr(
          " It is the reference scale of the series: in the harmonized count, each hotspot counts as 1.",
          " É a régua da série: na contagem harmonizada, cada foco vale 1.",
        )
      : factor === "k"
        ? tr(
            ` It sees fewer hotspots than VIIRS because its pixel is larger. In the harmonized count, each hotspot is worth the factor k of the 5° block where it fell${factors ? ` (${FACTOR.format(factors.world.k)} worldwide)` : ""}.`,
            ` Vê menos focos que o VIIRS porque o pixel é maior. Na contagem harmonizada, cada foco vale o k do bloco de 5° onde caiu${factors ? ` (${FACTOR.format(factors.world.k)} no mundo)` : ""}.`,
          )
        : factor === "k20"
          ? tr(
              ` It replaces S-NPP in the series. In the harmonized count, each hotspot is worth the factor k20 of the 5° block where it fell${factors ? ` (${FACTOR.format(factors.world.k20)} worldwide)` : ""}.`,
              ` Substitui o S-NPP na série. Na contagem harmonizada, cada foco vale o k20 do bloco de 5° onde caiu${factors ? ` (${FACTOR.format(factors.world.k20)} no mundo)` : ""}.`,
            )
          : tr(
              " The pipeline computes no factor for it, so its count is always raw and it stays out of the series.",
              " A pipeline não calcula fator para ele, então a contagem é sempre bruta e ele fica fora da série.",
            );
  return `${opening}${note}${counting}`;
}

export function SensorPicker({
  sensor,
  onSensorChange,
  period,
  spans,
  layers,
  lastDataDate,
  factors,
  autoLayers,
}: {
  sensor: MapSensor;
  onSensorChange: (sensor: MapSensor) => void;
  period: MapPeriod;
  spans: Map<string, LayerSpan>;
  layers: LayerRow[] | null;
  lastDataDate: string;
  factors: BlockFactors | null;
  autoLayers: SeriesLayer[];
}) {
  const t = useTr();
  const available = SENSOR_ORDER.filter((layer) => spans.has(layer));
  const rows = new Map((layers ?? []).map((row) => [row.layer, row]));
  const options: {
    value: MapSensor;
    name: string;
    detail: string;
    tag: string;
    enabled: boolean;
  }[] = [
    {
      value: "auto",
      name: t("Automatic", "Automático"),
      detail: t("the series sensor", "o sensor da série"),
      tag: t("harmonized series", "série harmonizada"),
      enabled: true,
    },
    ...available.map((layer) => {
      const span = spans.get(layer);
      const since = span?.first.slice(0, 4);
      return {
        value: layer,
        name: SENSOR_NAMES[layer],
        detail: `${pixelLabel(rows.get(layer)) ?? ""}${since ? t(` · since ${since}`, ` · desde ${since}`) : ""}`,
        tag: factorTag(layer, factors),
        enabled: sensorCovers(span, period),
      };
    }),
  ];
  const autoNames = andList([
    ...new Set(autoLayers.map((layer) => SENSOR_NAMES[layer])),
  ]);
  const explanation =
    sensor === "auto"
      ? t(
          `Each day, the map draws the sensor that feeds the harmonized series, the same one the calendar uses${autoLayers.length ? `: in this period, ${autoNames}` : ""}.`,
          `Em cada dia, o mapa desenha o sensor que alimenta a série harmonizada, o mesmo do calendário${autoLayers.length ? `: neste período, ${autoNames}` : ""}.`,
        )
      : sensorExplanation(
          sensor,
          rows.get(sensor),
          spans.get(sensor),
          lastDataDate,
          factors,
        );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="type-caption text-[18px] leading-6 tracking-[0.08em] text-ink-muted">
          Sensor
        </h3>
        <span className="type-body-sm text-ink-muted">
          {t(
            "One sensor at a time: the same heat source shows up on several satellites, so adding sensors together would count it more than once.",
            "Um sensor por vez: a mesma fonte de calor aparece em vários satélites, então somar sensores a contaria mais de uma vez.",
          )}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label={t("Map sensor", "Sensor do mapa")}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      >
        {options.map((option) => {
          const checked = option.value === sensor;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={!option.enabled}
              title={
                option.enabled
                  ? undefined
                  : t(
                      "This sensor does not cover the selected period",
                      "Este sensor não cobre o período escolhido",
                    )
              }
              onClick={() => onSensorChange(option.value)}
              className={`flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-[color,background-color,border-color] duration-200 ease-standard disabled:cursor-not-allowed disabled:opacity-40 ${checked ? "border-selected bg-selected text-ink-inverse" : "border-line bg-surface text-ink enabled:hover:border-ink enabled:hover:bg-surface-hover"}`}
            >
              <span className="type-body-sm w-full truncate font-semibold">
                {option.name}
              </span>
              <span
                className={`w-full truncate text-xs leading-4 ${checked ? "text-ink-inverse/75" : "text-ink-muted"}`}
              >
                {option.detail}
              </span>
              <span
                className={`mt-0.5 rounded-sm px-1.5 text-[11px] leading-4 tabular-nums ${checked ? "bg-ink-inverse/10" : "bg-surface-raised text-ink-muted"}`}
              >
                {option.tag}
              </span>
            </button>
          );
        })}
      </div>
      <p className="type-body-sm max-w-3xl text-ink-muted">{explanation}</p>
    </div>
  );
}
