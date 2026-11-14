const GRID_LINES = [268, 188, 108, 28];

const RAW_SERIES =
  "8,228 49.8,222.7 91.7,220 133.5,230.7 175.4,217.3 217.2,234.7 259.1,238.7 300.9,214.7 342.8,236 384.6,128 426.5,174.7 468.3,154.7 510.2,141.3 552,148";

const HARMONIZED_POINTS: [x: number, y: number][] = [
  [8, 108],
  [49.8, 86.7],
  [91.7, 76],
  [133.5, 118.7],
  [175.4, 65.3],
  [217.2, 134.7],
  [259.1, 150.7],
  [300.9, 54.7],
  [342.8, 140],
  [384.6, 128],
  [426.5, 174.7],
  [468.3, 154.7],
  [510.2, 141.3],
  [552, 148],
];

const YEAR_TICKS: [x: number, year: number][] = [
  [8, 2003],
  [133.5, 2006],
  [259.1, 2009],
  [384.6, 2012],
  [510.2, 2015],
];

export function HarmonizedSeriesFigure() {
  return (
    <figure className="rounded-xl border border-line bg-surface px-6 py-8 sm:px-10">
      <figcaption>
        <p className="type-heading-sm text-ink">Focos de calor na Bolívia</p>
        <p className="type-caption mt-1 text-ink-muted">
          2003-2016 · forma da série
        </p>
      </figcaption>
      <ul className="type-body-sm my-5 flex flex-wrap gap-x-6 gap-y-2 text-ink">
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="w-7 border-t-2 border-dashed border-ink-muted"
          />
          Contagem bruta: MODIS + VIIRS
        </li>
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="w-7 border-t-[2.5px] border-data-burned"
          />
          Harmonizada: equivalente VIIRS
        </li>
      </ul>
      <svg
        viewBox="0 0 560 300"
        role="img"
        aria-label="Gráfico de linhas, focos de calor na Bolívia de 2003 a 2016. A contagem bruta salta em 2012, quando o VIIRS entra. A série harmonizada segue sem salto."
        className="block w-full overflow-visible font-ui"
      >
        {GRID_LINES.map((y) => (
          <line key={y} x1="8" x2="552" y1={y} y2={y} className="stroke-line" />
        ))}
        <line
          x1="384.6"
          x2="384.6"
          y1="16"
          y2="268"
          strokeDasharray="3 4"
          className="stroke-ink-muted"
        />
        <text
          x="392.6"
          y="24"
          fontSize="12"
          letterSpacing="1.2"
          className="fill-ink"
        >
          VIIRS ENTRA
        </text>
        <polyline
          points={RAW_SERIES}
          fill="none"
          strokeWidth="2"
          strokeDasharray="6 5"
          strokeLinejoin="round"
          className="stroke-ink-muted"
        />
        <polyline
          points={HARMONIZED_POINTS.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="stroke-data-burned"
        />
        {HARMONIZED_POINTS.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="3" className="fill-data-burned" />
        ))}
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
    </figure>
  );
}
