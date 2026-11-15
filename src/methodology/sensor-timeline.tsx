"use client";

import { m, useInView } from "motion/react";
import { useRef } from "react";
import { formatFullDate } from "@/fire-calendar/calendar-labels";
import { localized, useTr } from "@/i18n/locale";
import { EASE_STANDARD } from "@/motion/chart-motion";

const FIRST_YEAR = 2000;
const LAST_YEAR = 2027;
const AXIS_YEARS = [2000, 2005, 2010, 2015, 2020, 2025];
const SNPP_END = 2026 + 306 / 365;
const SNPP_LAST_DAY = "2026-11-02";
const NOAA20_FIRST_DAY = "2026-11-03";
const ORBIT_DRIFT_STRIPES =
  "bg-[repeating-linear-gradient(135deg,rgba(10,10,11,0)_0_3px,rgba(10,10,11,0.6)_3px_6px)]";

const SATELLITES = [
  {
    instrument: "MODIS",
    satellite: "Terra",
    until: null,
    from: 2000 + 10 / 12,
    to: LAST_YEAR,
    driftFrom: 2020.1,
    className: "bg-modis",
  },
  {
    instrument: "MODIS",
    satellite: "Aqua",
    until: null,
    from: 2002.5,
    to: LAST_YEAR,
    driftFrom: 2021.95,
    className: "bg-modis",
  },
  {
    instrument: "VIIRS",
    satellite: "Suomi NPP",
    until: SNPP_LAST_DAY,
    from: 2012 + 19 / 365,
    to: SNPP_END,
    driftFrom: null,
    className: "bg-viirs",
  },
  {
    instrument: "VIIRS",
    satellite: "NOAA-20",
    until: null,
    from: 2018.25,
    to: LAST_YEAR,
    driftFrom: null,
    className: "bg-viirs",
  },
  {
    instrument: "VIIRS",
    satellite: "NOAA-21",
    until: null,
    from: 2023 + 59 / 365,
    to: LAST_YEAR,
    driftFrom: null,
    className: "bg-viirs opacity-45",
  },
];

type SeriesSegment = {
  label: string | null;
  shortLabel: string | null;
  from: number;
  to: number;
  className: string;
};

const HERU_SERIES = localized<SeriesSegment[]>(
  [
    {
      label: "MODIS × k",
      shortLabel: "× k",
      from: 2003,
      to: 2012,
      className: "rounded-l-xs bg-modis text-surface-ground",
    },
    {
      label: "VIIRS S-NPP, as observed",
      shortLabel: "S-NPP",
      from: 2012,
      to: SNPP_END,
      className: "bg-viirs text-ink",
    },
    {
      label: null,
      shortLabel: null,
      from: SNPP_END,
      to: LAST_YEAR,
      className: "rounded-r-xs bg-viirs-adjusted",
    },
  ],
  [
    {
      label: "MODIS × k",
      shortLabel: "× k",
      from: 2003,
      to: 2012,
      className: "rounded-l-xs bg-modis text-surface-ground",
    },
    {
      label: "VIIRS S-NPP, como observado",
      shortLabel: "S-NPP",
      from: 2012,
      to: SNPP_END,
      className: "bg-viirs text-ink",
    },
    {
      label: null,
      shortLabel: null,
      from: SNPP_END,
      to: LAST_YEAR,
      className: "rounded-r-xs bg-viirs-adjusted",
    },
  ],
);

const ROW_CLASS_NAME =
  "grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4";

const BAR_DURATION = 0.9;
const ROW_DELAY = 0.12;
const SERIES_DELAY = 0.9;

export function SensorTimeline() {
  const t = useTr();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const grow = (delay: number, duration = BAR_DURATION) => ({
    initial: { scaleX: 0 },
    animate: { scaleX: inView ? 1 : 0 },
    transition: { duration, delay, ease: EASE_STANDARD },
  });
  return (
    <figure
      ref={ref}
      role="img"
      aria-label={t(
        "Sensor timeline from 2000 to 2027. MODIS on Terra since 2000 and on Aqua since 2002, with orbital drift from 2020 and 2021. VIIRS on Suomi NPP from 2012 to November 2, 2026, on NOAA-20 since 2018, and on NOAA-21 since 2023. The HERU series uses MODIS times k from 2003 to 2011, S-NPP from 2012 to November 2, 2026, and NOAA-20 times k20 after that.",
        "Linha do tempo dos sensores de 2000 a 2027. MODIS no Terra desde 2000 e no Aqua desde 2002, com deriva de órbita a partir de 2020 e 2021. VIIRS no Suomi NPP de 2012 a 2 de novembro de 2026, no NOAA-20 desde 2018 e no NOAA-21 desde 2023. A série do HERU usa MODIS vezes k de 2003 a 2011, S-NPP de 2012 a 2 de novembro de 2026 e NOAA-20 vezes k20 depois.",
      )}
      className="rounded-md border border-line bg-surface p-4 sm:p-6"
    >
      <div className="relative flex flex-col gap-2.5">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 left-[108px] sm:left-[166px]"
        >
          {AXIS_YEARS.map((year) => (
            <span
              key={year}
              className="absolute inset-y-0 w-px bg-line"
              style={{ left: position(year) }}
            />
          ))}
        </div>
        {SATELLITES.map((row, index) => (
          <div key={row.satellite} className={`${ROW_CLASS_NAME} min-h-9`}>
            <span className="flex flex-col">
              <span className="font-ui text-sm leading-4 font-semibold text-ink">
                {row.instrument}
              </span>
              <span className="font-ui text-xs leading-[14px] text-ink-muted">
                {row.until
                  ? `${row.satellite} · ${t("until", "até")} ${formatFullDate(row.until)}`
                  : row.satellite}
              </span>
            </span>
            <span aria-hidden="true" className="relative block h-6">
              <m.span
                className={`absolute top-1.5 h-3 rounded-xs ${row.className}`}
                {...grow(index * ROW_DELAY)}
                style={{ ...span(row.from, row.to), originX: 0 }}
              />
              {row.driftFrom && (
                <m.span
                  className={`absolute top-1.5 h-3 rounded-r-xs ${ORBIT_DRIFT_STRIPES}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: inView ? 1 : 0 }}
                  transition={{
                    duration: 0.4,
                    delay: index * ROW_DELAY + BAR_DURATION,
                  }}
                  style={span(row.driftFrom, row.to)}
                />
              )}
            </span>
          </div>
        ))}
        <div className={`${ROW_CLASS_NAME} mt-2 h-9 border-t border-line pt-3`}>
          <span className="font-ui text-sm font-bold text-ink">
            {t("HERU series", "Série do HERU")}
          </span>
          <span aria-hidden="true" className="relative block h-6">
            {HERU_SERIES.map((segment, index) => (
              <m.span
                key={segment.from}
                className={`absolute top-0.5 flex h-5 items-center justify-center overflow-hidden font-ui text-[11px] font-semibold whitespace-nowrap sm:text-xs ${segment.className}`}
                {...grow(SERIES_DELAY + index * 0.45, 0.5)}
                style={{ ...span(segment.from, segment.to), originX: 0 }}
              >
                <m.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: inView ? 1 : 0 }}
                  transition={{ delay: SERIES_DELAY + index * 0.45 + 0.4 }}
                >
                  <span className="sm:hidden">{segment.shortLabel}</span>
                  <span className="max-sm:hidden">{segment.label}</span>
                </m.span>
              </m.span>
            ))}
          </span>
        </div>
        <div aria-hidden="true" className={`${ROW_CLASS_NAME} h-4`}>
          <span />
          <span className="relative block">
            {AXIS_YEARS.map((year) => (
              <span
                key={year}
                className="type-caption absolute -translate-x-1/2 text-ink-muted tabular-nums"
                style={{ left: position(year) }}
              >
                {year}
              </span>
            ))}
          </span>
        </div>
      </div>
      <figcaption className="type-body-sm mt-5 flex flex-wrap gap-x-6 gap-y-2 text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2.5 w-6 rounded-xs bg-modis ${ORBIT_DRIFT_STRIPES}`}
          />
          {t("MODIS orbital drift", "Deriva de órbita do MODIS")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-6 rounded-xs bg-viirs opacity-45"
          />
          {t(
            "NOAA-21: not in the harmonized series",
            "NOAA-21: fora da série harmonizada",
          )}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-6 rounded-xs bg-viirs-adjusted"
          />
          {t("NOAA-20 × k20, from", "NOAA-20 × k20, a partir de")}{" "}
          {formatFullDate(NOAA20_FIRST_DAY)}
        </span>
      </figcaption>
    </figure>
  );
}

function position(year: number): string {
  return `${((year - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR)) * 100}%`;
}

function span(from: number, to: number) {
  return {
    left: position(from),
    width: `${((to - from) / (LAST_YEAR - FIRST_YEAR)) * 100}%`,
  };
}
