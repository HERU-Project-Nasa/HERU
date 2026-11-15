"use client";

import { m, useInView } from "motion/react";
import { useRef } from "react";
import { localized, tr, useLocale, useTr } from "@/i18n/locale";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import { EASE_STANDARD } from "@/motion/chart-motion";

const NODES = localized<{ symbol: SymbolName; title: string; text: string }[]>(
  [
    {
      symbol: "satellite_alt",
      title: "NASA FIRMS",
      text: "Satellite detections",
    },
    {
      symbol: "refresh",
      title: "HERU pipeline",
      text: "Publishes a batch when something changes",
    },
    { symbol: "public", title: "Website", text: "Downloads only what changed" },
  ],
  [
    {
      symbol: "satellite_alt",
      title: "NASA FIRMS",
      text: "Detecções dos satélites",
    },
    {
      symbol: "refresh",
      title: "Pipeline HERU",
      text: "Publica um lote quando algo muda",
    },
    { symbol: "public", title: "Site", text: "Baixa só o que mudou" },
  ],
);

const LINKS = localized(
  ["fetches every hour", "checks every minute"],
  ["busca a cada hora", "confere a cada minuto"],
);

type LifeStage = {
  when: string;
  title: string;
  chip: { label: string; className: string } | null;
};

const LIFE = localized<LifeStage[]>(
  [
    {
      when: "Satellite overpass",
      title: "Hotspot detected",
      chip: null,
    },
    {
      when: "about 3 h later",
      title: "Near real-time (NRT)",
      chip: {
        label: "Preliminary",
        className: "bg-status-stale/12 text-status-stale",
      },
    },
    {
      when: "2 to 4 months later",
      title: "Science product",
      chip: {
        label: "Final",
        className: "bg-status-live/14 text-status-live",
      },
    },
  ],
  [
    {
      when: "Passagem do satélite",
      title: "Foco detectado",
      chip: null,
    },
    {
      when: "cerca de 3 h depois",
      title: "Quase tempo real",
      chip: {
        label: "Preliminar",
        className: "bg-status-stale/12 text-status-stale",
      },
    },
    {
      when: "2 a 4 meses depois",
      title: "Produto científico",
      chip: {
        label: "Definitivo",
        className: "bg-status-live/14 text-status-live",
      },
    },
  ],
);

/** Hours in UTC shown on the day strip: from 12 h of one day to 12 h of the next. */
const STRIP_START = 12;
const STRIP_HOURS = 24;
const BRASILIA_OFFSET = -3;
const EXAMPLE_UTC_HOUR = 25;
const STRIP_TICKS = [12, 18, 24, 30, 36];

function stripPosition(utcHour: number): string {
  return `${((utcHour - STRIP_START) / STRIP_HOURS) * 100}%`;
}

/** "22:00" in English, "22 h" in Portuguese. */
function clockLabel(hour: number): string {
  const hours = String(((hour % 24) + 24) % 24).padStart(2, "0");
  return tr(`${hours}:00`, `${hours} h`);
}

export function DataFlowFigure() {
  const t = useTr();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const shown = inView ? "shown" : "hidden";

  return (
    <figure
      ref={ref}
      className="flex flex-col gap-6 rounded-md border border-line bg-surface p-4 sm:p-6"
    >
      <div className="flex flex-col gap-3">
        <span className="type-caption text-ink-muted">
          {t("Data path", "Caminho dos dados")}
        </span>
        <ol className="flex flex-col items-stretch gap-0 sm:flex-row sm:items-center">
          {NODES.map((node, index) => (
            <li key={node.symbol} className="contents">
              <m.div
                className="flex flex-1 items-center gap-3 rounded-md border border-line-strong bg-surface-hover px-3 py-2.5"
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                transition={{
                  duration: 0.45,
                  delay: index * 0.35,
                  ease: EASE_STANDARD,
                }}
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink">
                  <MaterialSymbol name={node.symbol} className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="type-body-sm font-semibold text-ink">
                    {node.title}
                  </span>
                  <span className="type-body-sm text-ink-muted">
                    {node.text}
                  </span>
                </span>
              </m.div>
              {index < LINKS.length && (
                <FlowLink label={LINKS[index]} order={index} inView={inView} />
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <span className="type-caption text-ink-muted">
          {t("Life of a data point", "A vida de um dado")}
        </span>
        <div className="relative grid gap-4 sm:grid-cols-3 sm:gap-6">
          <span
            aria-hidden="true"
            className="absolute top-[11px] right-[16.6%] left-[16.6%] h-0.5 bg-line max-sm:hidden"
          >
            <m.span
              className="absolute inset-0 origin-left bg-[linear-gradient(90deg,var(--color-ink-muted),var(--color-status-stale),var(--color-status-live))]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: inView ? 1 : 0 }}
              transition={{
                duration: 1.6,
                delay: 0.9,
                ease: [0.45, 0, 0.2, 1],
              }}
            />
          </span>
          {LIFE.map((stage, index) => (
            <m.div
              key={index}
              className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:text-center"
              initial="hidden"
              animate={shown}
              variants={{
                hidden: { opacity: 0, y: 8 },
                shown: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.45,
                    delay: 0.9 + index * 0.6,
                    ease: EASE_STANDARD,
                  },
                },
              }}
            >
              <span
                aria-hidden="true"
                className={`relative z-10 mt-0.5 size-5 shrink-0 rounded-full border-2 border-surface ${index === 0 ? "bg-ink-muted" : index === 1 ? "bg-status-stale" : "bg-status-live"}`}
              />
              <span className="flex flex-col gap-1 sm:items-center">
                <span className="type-caption text-ink-muted">
                  {stage.when}
                </span>
                <span className="type-body-sm font-semibold text-ink">
                  {stage.title}
                </span>
                {stage.chip && (
                  <span
                    className={`inline-flex h-6 w-fit items-center rounded-sm px-2 font-ui text-xs leading-4 font-semibold tracking-[0.06em] uppercase ${stage.chip.className}`}
                  >
                    {stage.chip.label}
                  </span>
                )}
              </span>
            </m.div>
          ))}
        </div>
      </div>

      <UtcDayStrip inView={inView} />
    </figure>
  );
}

function FlowLink({
  label,
  order,
  inView,
}: {
  label: string;
  order: number;
  inView: boolean;
}) {
  const delay = 0.6 + order * 0.35;
  const duration = order === 0 ? 2.4 : 1.2;
  const repeatDelay = order === 0 ? 1.2 : 0.4;
  return (
    <m.div
      aria-hidden="true"
      className="relative flex shrink-0 items-center justify-center max-sm:h-12 max-sm:pl-7 sm:w-28 sm:flex-col sm:gap-1"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : undefined}
      transition={{ duration: 0.4, delay }}
    >
      <span className="type-caption order-last text-center text-[10px] leading-3 text-ink-muted max-sm:ml-4 sm:order-first">
        {label}
      </span>
      <span className="relative block overflow-hidden bg-line max-sm:absolute max-sm:inset-y-0 max-sm:left-[17px] max-sm:w-0.5 sm:h-0.5 sm:w-full">
        <TravelingDot
          axis="left"
          duration={duration}
          delay={delay}
          repeatDelay={repeatDelay}
          inView={inView}
        />
        <TravelingDot
          axis="top"
          duration={duration}
          delay={delay}
          repeatDelay={repeatDelay}
          inView={inView}
        />
      </span>
    </m.div>
  );
}

function TravelingDot({
  axis,
  duration,
  delay,
  repeatDelay,
  inView,
}: {
  axis: "left" | "top";
  duration: number;
  delay: number;
  repeatDelay: number;
  inView: boolean;
}) {
  return (
    <m.span
      className={`absolute block size-2 rounded-full bg-viirs-adjusted shadow-[0_0_8px_var(--color-viirs-adjusted)] ${axis === "left" ? "top-1/2 -translate-y-1/2 max-sm:hidden" : "left-1/2 -translate-x-1/2 sm:hidden"}`}
      initial={{ [axis]: "-10%", opacity: 0 }}
      animate={
        inView ? { [axis]: ["-10%", "100%"], opacity: [0, 1, 1, 0] } : undefined
      }
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay,
        ease: "easeInOut",
      }}
    />
  );
}

function DayBar({ splitAt }: { splitAt: number }) {
  const t = useTr();
  return (
    <div className="relative flex h-7 overflow-hidden rounded-xs">
      <span
        className="type-caption flex items-center justify-center bg-surface-hover text-[10px] text-ink-muted"
        style={{ width: stripPosition(splitAt) }}
      >
        {t("day 14", "dia 14")}
      </span>
      <span className="type-caption flex flex-1 items-center justify-center bg-viirs/18 text-[10px] text-ink">
        {t("day 15", "dia 15")}
      </span>
    </div>
  );
}

function StripTicks({ offset }: { offset: number }) {
  useLocale();
  return (
    <div aria-hidden="true" className="relative h-4">
      {STRIP_TICKS.map((hour) => (
        <span
          key={hour}
          className="type-caption absolute -translate-x-1/2 text-[10px] whitespace-nowrap text-ink-muted tabular-nums first:translate-x-0 last:-translate-x-full"
          style={{ left: stripPosition(hour) }}
        >
          {clockLabel(hour + offset)}
        </span>
      ))}
    </div>
  );
}

function UtcDayStrip({ inView }: { inView: boolean }) {
  const t = useTr();
  const exampleBrasilia = EXAMPLE_UTC_HOUR + BRASILIA_OFFSET;
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-5">
      <span className="type-caption text-ink-muted">
        {t("Days follow UTC", "Os dias seguem o UTC")}
      </span>
      <div className="flex gap-3">
        <div className="type-body-sm flex w-[72px] shrink-0 flex-col gap-1.5 pt-[22px] text-ink-muted sm:w-[110px]">
          <span className="flex h-7 items-center">Brasília</span>
          <span className="flex h-7 items-center">UTC</span>
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
          <StripTicks offset={BRASILIA_OFFSET} />
          <DayBar splitAt={24 - BRASILIA_OFFSET} />
          <DayBar splitAt={24} />
          <StripTicks offset={0} />
          <m.span
            aria-hidden="true"
            className="absolute top-[22px] h-[62px] w-px origin-top bg-ink"
            style={{ left: stripPosition(24) }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: inView ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 2.6, ease: EASE_STANDARD }}
          />
          <m.span
            aria-hidden="true"
            className="absolute size-3 -translate-x-1/2 rounded-full bg-heat-4 shadow-[0_0_0_3px_rgba(255,138,61,0.3)]"
            style={{ left: stripPosition(EXAMPLE_UTC_HOUR) }}
            initial={{ top: 30, opacity: 0 }}
            animate={
              inView ? { top: [30, 30, 64], opacity: [0, 1, 1] } : undefined
            }
            transition={{
              duration: 1.4,
              delay: 3,
              times: [0, 0.35, 1],
              ease: EASE_STANDARD,
            }}
          />
        </div>
      </div>
      <m.p
        className="type-body-sm text-ink-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: inView ? 1 : 0 }}
        transition={{ duration: 0.4, delay: 3.8 }}
      >
        {t(
          <>
            <span className="font-semibold text-ink">
              A hotspot at {clockLabel(exampleBrasilia)} on day 14 in Brasília
            </span>{" "}
            is already {clockLabel(EXAMPLE_UTC_HOUR)} on day 15 in UTC, so it
            counts on day 15. A day only closes after the last overpass; until
            then it shows as partial.
          </>,
          <>
            <span className="font-semibold text-ink">
              Um foco às {clockLabel(exampleBrasilia)} do dia 14 em Brasília
            </span>{" "}
            já é {clockLabel(EXAMPLE_UTC_HOUR)} do dia 15 em UTC, e conta no dia
            15. Um dia só fecha depois da última passagem; até lá ele aparece
            como parcial.
          </>,
        )}
      </m.p>
    </div>
  );
}
