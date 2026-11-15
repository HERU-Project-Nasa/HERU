"use client";

import { useEffect, useId, useRef } from "react";
import {
  BASELINE,
  HARMONIZED_Y,
  RAW_Y,
  SERIES_X,
  type SeriesFrame,
  startHarmonizedSeries,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  VIIRS_ENTRY_X,
} from "./harmonized-series-scene";

const GRID_LINES = [BASELINE, 188, 108, 28];

const YEAR_TICKS: [x: number, year: number][] = [
  [SERIES_X[0], 2003],
  [SERIES_X[3], 2006],
  [SERIES_X[6], 2009],
  [SERIES_X[9], 2012],
  [SERIES_X[12], 2015],
];

const RAW_POINTS = toPoints(RAW_Y);

export function HarmonizedSeriesFigure() {
  const clipId = `raw-clip-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawClipRef = useRef<SVGRectElement>(null);
  const rawRef = useRef<SVGPolylineElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const harmonizedRef = useRef<SVGGElement>(null);
  const harmonizedLineRef = useRef<SVGPolylineElement>(null);
  const dotsRef = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const rawClip = rawClipRef.current!;
    const raw = rawRef.current!;
    const marker = markerRef.current!;
    const harmonized = harmonizedRef.current!;
    const harmonizedLine = harmonizedLineRef.current!;
    const dots = [...dotsRef.current];
    const apply = (frame: SeriesFrame) => {
      rawClip.setAttribute("width", String(frame.rawReveal * VIEW_WIDTH));
      raw.style.opacity = String(frame.rawOpacity * frame.visibility);
      marker.style.opacity = String(frame.markerReveal * frame.visibility);
      marker.style.transform = `translateY(${(1 - frame.markerReveal) * -12}px)`;
      harmonized.style.opacity = String(
        frame.harmonizedOpacity * frame.visibility,
      );
      harmonizedLine.setAttribute("points", toPoints(frame.ys));
      frame.ys.forEach((y, index) => {
        dots[index]?.setAttribute("cy", y.toFixed(2));
      });
    };
    return startHarmonizedSeries(
      containerRef.current!,
      canvasRef.current!,
      apply,
    );
  }, []);

  return (
    <figure className="rounded-xl border border-line bg-surface px-6 py-8 sm:px-10">
      <figcaption>
        <p className="type-heading-sm text-ink">
          Focos de calor nos Estados Unidos
        </p>
        <p className="type-caption mt-1 text-ink-muted">
          Focos por ano, 2003-2016 · série do HERU
        </p>
      </figcaption>
      <ul className="type-body-sm my-5 flex flex-wrap gap-x-6 gap-y-2 text-ink">
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="w-7 border-t-2 border-dashed border-ink-muted"
          />
          Contagem bruta: MODIS até 2011, VIIRS depois
        </li>
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="w-7 border-t-[2.5px] border-data-burned"
          />
          Harmonizada: equivalente VIIRS
        </li>
      </ul>
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full"
        />
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          role="img"
<<<<<<< HEAD
<<<<<<< HEAD
          aria-label="Gráfico de linhas animado, focos de calor nos Estados Unidos de 2003 a 2016. A contagem bruta salta em 2012, quando o VIIRS entra. Depois de harmonizada, a série sobe para a mesma escala e segue sem salto."
=======
          aria-label="Gráfico de linhas animado, focos de calor na Bolívia de 2003 a 2016. A contagem bruta salta em 2012, quando o VIIRS entra. Depois de harmonizada, a série sobe para a mesma escala e segue sem salto."
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
=======
          aria-label="Gráfico de linhas animado, focos de calor nos Estados Unidos de 2003 a 2016. A contagem bruta salta em 2012, quando o VIIRS entra. Depois de harmonizada, a série sobe para a mesma escala e segue sem salto."
>>>>>>> 64dcc6316b354790f1c2374c891c435a06dbd88e
          className="relative block w-full overflow-visible font-ui"
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                ref={rawClipRef}
                x="0"
                y="0"
                width={VIEW_WIDTH}
                height={VIEW_HEIGHT}
              />
            </clipPath>
          </defs>
          {GRID_LINES.map((y) => (
            <line
              key={y}
              x1="8"
              x2="552"
              y1={y}
              y2={y}
              className="stroke-line"
            />
          ))}
          <g ref={markerRef}>
            <line
              x1={VIIRS_ENTRY_X}
              x2={VIIRS_ENTRY_X}
              y1="16"
              y2={BASELINE}
              strokeDasharray="3 4"
              className="stroke-ink-muted"
            />
            <text
              x={VIIRS_ENTRY_X + 8}
              y="24"
              fontSize="12"
              letterSpacing="1.2"
              className="fill-ink"
            >
              VIIRS ENTRA
            </text>
          </g>
          <polyline
            ref={rawRef}
            points={RAW_POINTS}
            clipPath={`url(#${clipId})`}
            fill="none"
            strokeWidth="2"
            strokeDasharray="6 5"
            strokeLinejoin="round"
            className="stroke-ink-muted"
          />
          <g ref={harmonizedRef}>
            <polyline
              ref={harmonizedLineRef}
              points={toPoints(HARMONIZED_Y)}
              fill="none"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="stroke-data-burned"
            />
            {SERIES_X.map((x, index) => (
              <circle
                key={x}
                ref={(element) => {
                  dotsRef.current[index] = element;
                }}
                cx={x}
                cy={HARMONIZED_Y[index]}
                r="3"
                className="fill-data-burned"
              />
            ))}
          </g>
          {YEAR_TICKS.map(([x, year]) => (
            <text
              key={year}
              x={x}
              y="292"
              fontSize="12"
              letterSpacing="1"
              textAnchor="middle"
              className="fill-ink-muted"
            >
              {year}
            </text>
          ))}
        </svg>
      </div>
    </figure>
  );
}

function toPoints(ys: number[]): string {
  return ys.map((y, index) => `${SERIES_X[index]},${y.toFixed(2)}`).join(" ");
}
