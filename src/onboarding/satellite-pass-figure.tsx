import Image from "next/image";

export function SatellitePassFigure() {
  return (
    <figure className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-ground">
      <Image
        src="/onboarding/satellite-pass.webp"
        alt="Globo centrado na Bolívia, cortado por duas faixas de passagem de satélite: VIIRS, mais larga, e MODIS. A Bolívia aparece destacada, com muitos focos de calor em vermelho."
        fill
        loading="eager"
        sizes="(min-width: 1024px) 640px, 100vw"
        className="object-cover"
      />
      <figcaption className="type-caption absolute top-5 left-5 text-ink">
        Uma passagem sobre a Bolívia
      </figcaption>
      <ul className="type-body-sm absolute bottom-5 left-5 flex flex-col gap-2.5 rounded-md border border-line bg-surface p-4 text-ink">
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="w-7 border-t-[1.5px] border-ink"
          />
          VIIRS (S-NPP) · faixa de 3.000 km
        </li>
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="w-7 border-t-[1.5px] border-dashed border-ink-muted"
          />
          MODIS · faixa de 2.330 km
        </li>
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-3.5 w-7 rounded-xs border-[1.5px] border-region-line bg-region-fill"
          />
          Bolívia
        </li>
      </ul>
    </figure>
  );
}
