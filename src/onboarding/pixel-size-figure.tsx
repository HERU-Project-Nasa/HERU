"use client";

import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  detectionTimes,
  type PixelGrid,
  startPixelScan,
} from "./pixel-scan-scene";

export function PixelSizeFigure() {
  return (
    <figure className="rounded-xl border border-line bg-surface p-6 sm:p-10">
      <div
        role="img"
        aria-label="Esquema animado: o mesmo quadrado de chão com três fogos pequenos é varrido pelo sensor. O MODIS, com um pixel de 1 km, registra um foco. O VIIRS, com pixels de 375 m, registra três."
        className="flex gap-6 sm:gap-10"
      >
        <SensorPanel
          grid="modis"
          sensor="MODIS"
          pixelSize="Pixel de 1 km"
          order={0}
        />
        <SensorPanel
          grid="viirs"
          sensor="VIIRS"
          pixelSize="Pixels de 375 m"
          order={1}
        />
      </div>
      <figcaption className="type-body-sm mt-6 flex items-center gap-3 border-t border-line pt-4 text-ink-muted">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full bg-heat-4 shadow-[0_0_0_3px_rgba(255,138,61,0.25)]"
        />
        Mesmo chão, os mesmos três fogos. Esquema simplificado.
      </figcaption>
    </figure>
  );
}

function SensorPanel({
  grid,
  sensor,
  pixelSize,
  order,
}: {
  grid: PixelGrid;
  sensor: string;
  pixelSize: string;
  order: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [count, setCount] = useState(detectionTimes(grid).length);

  useEffect(
    () =>
      startPixelScan(containerRef.current!, canvasRef.current!, grid, setCount),
    [grid],
  );

  return (
    <m.div
      className="flex min-w-0 flex-1 flex-col gap-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.7,
        delay: 0.2 + order * 0.15,
        ease: [0.65, 0, 0.35, 1],
      }}
    >
      <div>
        <p className="type-heading-sm text-ink">{sensor}</p>
        <p className="type-caption text-ink-muted">{pixelSize}</p>
      </div>
      <div
        ref={containerRef}
        className="relative aspect-square overflow-hidden rounded-xs bg-globe-land"
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 size-full"
        />
      </div>
      <p className="type-data flex h-6 items-center gap-2 text-ink">
        <m.span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full bg-data-burned"
          animate={{ opacity: count > 0 ? 1 : 0.3 }}
        />
        <m.span
          key={count}
          className={count > 0 ? "text-ink" : "text-ink-muted"}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
        >
          {count === 0
            ? "Procurando focos..."
            : `${count} ${count === 1 ? "foco" : "focos"} de calor`}
        </m.span>
      </p>
    </m.div>
  );
}
