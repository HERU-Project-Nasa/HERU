"use client";

import { m, useInView } from "motion/react";
import { useRef } from "react";
import { localNumberFormat } from "@/i18n/format";
import { useTr } from "@/i18n/locale";
import { AnimatedNumber, EASE_STANDARD } from "@/motion/chart-motion";

const MODIS_SIZE = 160;
const MODIS_METERS = 1000;
const VIIRS_METERS = 375;
const VIIRS_SIZE = (VIIRS_METERS / MODIS_METERS) * MODIS_SIZE;
const PIXELS_PER_MODIS = (MODIS_METERS / VIIRS_METERS) ** 2;
const TILES_PER_SIDE = Math.ceil(MODIS_SIZE / VIIRS_SIZE);
const ONE_DECIMAL = localNumberFormat({
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const INTEGER = localNumberFormat({ maximumFractionDigits: 0 });
const formatPixels = (value: number) => ONE_DECIMAL.format(value);

export function PixelScaleFigure() {
  const t = useTr();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const tiles = Array.from({ length: TILES_PER_SIDE ** 2 }, (_, index) => ({
    row: Math.floor(index / TILES_PER_SIDE),
    column: index % TILES_PER_SIDE,
  }));

  return (
    <figure
      ref={ref}
      className="flex flex-col gap-5 rounded-md border border-line bg-surface p-6"
    >
      <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
        <div className="flex flex-col gap-2">
          <m.span
            aria-hidden="true"
            className="relative block overflow-hidden rounded-xs border-[1.5px] border-modis bg-globe-land"
            style={{ width: MODIS_SIZE, height: MODIS_SIZE }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={inView ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.5, ease: EASE_STANDARD }}
          >
            {tiles.map(({ row, column }) => (
              <m.span
                key={`${row}-${column}`}
                className="absolute border border-viirs/70 bg-viirs/12"
                style={{
                  left: column * VIIRS_SIZE,
                  top: row * VIIRS_SIZE,
                  width: VIIRS_SIZE,
                  height: VIIRS_SIZE,
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={inView ? { opacity: 1, scale: 1 } : undefined}
                transition={{
                  duration: 0.35,
                  delay: 0.6 + (row + column) * 0.12,
                  ease: EASE_STANDARD,
                }}
              />
            ))}
            <CenterDot delay={0.3} inView={inView} />
          </m.span>
          <span className="type-data text-ink">
            {t("MODIS · about 1 km", "MODIS · cerca de 1 km")}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <m.span
            aria-hidden="true"
            className="relative block rounded-xs border-[1.5px] border-viirs bg-globe-land"
            style={{ width: VIIRS_SIZE, height: VIIRS_SIZE }}
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : undefined}
            transition={{ duration: 0.5, delay: 0.25, ease: EASE_STANDARD }}
          >
            <CenterDot delay={0.5} inView={inView} />
          </m.span>
          <span className="type-data text-ink">VIIRS · 375 m</span>
        </div>
        <m.div
          className="flex min-w-[180px] flex-1 flex-col gap-1 border-l-2 border-viirs pl-4"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : undefined}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <span className="type-stat-xl text-ink">
            ≈ <AnimatedNumber value={PIXELS_PER_MODIS} format={formatPixels} />
          </span>
          <span className="type-body-sm text-ink-muted">
            {t(
              "VIIRS pixels fit in one MODIS pixel",
              "pixels VIIRS cabem em um pixel MODIS",
            )}
          </span>
          <span className="type-body-sm text-ink-muted tabular-nums">
            ({INTEGER.format(MODIS_METERS)} m ÷ {VIIRS_METERS} m)²
          </span>
        </m.div>
      </div>
      <figcaption className="type-body-sm flex items-start gap-2.5 border-t border-line pt-4 text-ink-muted">
        <span
          aria-hidden="true"
          className="mt-1.5 size-2.5 shrink-0 rounded-full bg-heat-4 shadow-[0_0_0_3px_rgba(255,138,61,0.25)]"
        />
        {t(
          "Squares drawn to scale. Each hotspot's coordinate is the center of its pixel, marked in orange: the larger the pixel, the less precise the position.",
          "Quadrados em escala. A coordenada de cada foco é o centro do pixel, marcado em laranja: quanto maior o pixel, menos precisa é a posição.",
        )}
      </figcaption>
    </figure>
  );
}

function CenterDot({ delay, inView }: { delay: number; inView: boolean }) {
  return (
    <span className="absolute top-1/2 left-1/2 -translate-1/2">
      <m.span
        className="absolute top-1/2 left-1/2 block size-5 -translate-1/2 rounded-full bg-heat-4/30"
        initial={{ scale: 0, opacity: 0 }}
        animate={inView ? { scale: [0.4, 1.6], opacity: [0.8, 0] } : undefined}
        transition={{
          duration: 1.8,
          delay: delay + 0.4,
          repeat: Infinity,
          repeatDelay: 1.2,
          ease: "easeOut",
        }}
      />
      <m.span
        className="relative block size-2.5 rounded-full bg-heat-4"
        initial={{ scale: 0 }}
        animate={inView ? { scale: 1 } : undefined}
        transition={{ duration: 0.3, delay, ease: EASE_STANDARD }}
      />
    </span>
  );
}
