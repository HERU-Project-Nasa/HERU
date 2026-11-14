import type { ReactNode } from "react";

const FIRE_POSITIONS = [
  "left-[22%] top-[30%]",
  "left-[60%] top-[45%]",
  "left-[30%] top-[82%]",
];

const VIIRS_DETECTED_PIXELS = [0, 4, 6];

export function PixelSizeFigure() {
  return (
    <figure className="rounded-xl border border-line bg-surface p-6 sm:p-10">
      <div
        role="img"
        aria-label="Esquema: o mesmo quadrado de chão com três fogos pequenos. O MODIS, com um pixel de 1 km, registra um foco. O VIIRS, com pixels de 375 m, registra três."
        className="flex gap-6 sm:gap-10"
      >
        <SensorPanel
          sensor="MODIS"
          pixelSize="Pixel de 1 km"
          detections="1 foco de calor"
        >
          <span className="absolute inset-0 border-[1.5px] border-data-burned/90 bg-data-burned/22" />
        </SensorPanel>
        <SensorPanel
          sensor="VIIRS"
          pixelSize="Pixels de 375 m"
          detections="3 focos de calor"
        >
          <span className="absolute inset-0 grid grid-cols-[37.5fr_37.5fr_25fr] grid-rows-[37.5fr_37.5fr_25fr]">
            {Array.from({ length: 9 }, (_, pixel) => (
              <span
                key={pixel}
                className={
                  VIIRS_DETECTED_PIXELS.includes(pixel)
                    ? "border border-data-burned/90 bg-data-burned/28"
                    : "border border-ink/22"
                }
              />
            ))}
          </span>
        </SensorPanel>
      </div>
      <figcaption className="type-body-sm mt-6 flex items-center gap-3 border-t border-line pt-4 text-ink-muted">
        <FireDot className="relative" />
        Mesmo chão, os mesmos três fogos. Esquema simplificado.
      </figcaption>
    </figure>
  );
}

function SensorPanel({
  sensor,
  pixelSize,
  detections,
  children,
}: {
  sensor: string;
  pixelSize: string;
  detections: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div>
        <p className="type-heading-sm text-ink">{sensor}</p>
        <p className="type-caption text-ink-muted">{pixelSize}</p>
      </div>
      <div className="relative aspect-square overflow-hidden rounded-xs bg-globe-land">
        {children}
        {FIRE_POSITIONS.map((position) => (
          <FireDot
            key={position}
            className={`absolute -mt-[5px] -ml-[5px] ${position}`}
          />
        ))}
      </div>
      <p className="type-data flex items-center gap-2 text-ink">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full bg-data-burned"
        />
        {detections}
      </p>
    </div>
  );
}

function FireDot({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`size-2.5 shrink-0 rounded-full bg-heat-4 shadow-[0_0_0_3px_rgba(255,138,61,0.25)] ${className}`}
    />
  );
}
