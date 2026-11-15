"use client";

import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { startSatellitePass } from "./satellite-pass-scene";

const LABEL_CLASS_NAME =
  "type-caption pointer-events-none absolute top-0 left-0 rounded-sm border bg-surface-ground/85 px-2 py-1 whitespace-nowrap normal-case tracking-normal opacity-0 backdrop-blur-sm transition-opacity duration-300";

export function SatellitePassFigure() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viirsLabelRef = useRef<HTMLSpanElement>(null);
  const modisLabelRef = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(
    () =>
      startSatellitePass(
        containerRef.current!,
        canvasRef.current!,
        { viirs: viirsLabelRef.current!, modis: modisLabelRef.current! },
        () => setReady(true),
      ),
    [],
  );

  return (
    <figure className="relative overflow-hidden rounded-xl border border-line bg-surface-ground">
      <div
        ref={containerRef}
        role="img"
        aria-label="Ilustração em vista oblíqua da América do Norte. Um satélite passa de sul a norte e duas faixas varrem o solo: a do VIIRS, com 3.000 km, e a do MODIS, com 2.330 km. Um anel marca o sudeste dos Estados Unidos, onde focos de calor em vermelho aparecem conforme a faixa passa."
        className="relative aspect-[6/5]"
      >
        <m.canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 size-full"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={ready ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
        />
        <span
          ref={viirsLabelRef}
          aria-hidden="true"
          className={`${LABEL_CLASS_NAME} border-viirs-adjusted/60 text-viirs-adjusted`}
        >
          VIIRS (S-NPP) · faixa de 3.000 km
        </span>
        <span
          ref={modisLabelRef}
          aria-hidden="true"
          className={`${LABEL_CLASS_NAME} border-heat-4/60 text-heat-4`}
        >
          MODIS · faixa de 2.330 km
        </span>
      </div>
      <figcaption className="type-caption absolute top-5 left-5 text-ink">
        Ilustração: uma passagem sobre o sudeste dos EUA
      </figcaption>
      <ul className="type-body-sm absolute bottom-5 left-5 flex flex-col gap-2.5 rounded-md border border-line bg-surface/90 p-4 text-ink backdrop-blur-sm">
        <li className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex w-4 justify-center">
            <span className="size-3.5 rounded-full border-[1.5px] border-ink" />
          </span>
          Sudeste dos EUA
        </li>
        <li className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex w-4 justify-center">
            <span className="size-2 rounded-full bg-data-burned" />
          </span>
          Foco de calor
        </li>
      </ul>
    </figure>
  );
}
