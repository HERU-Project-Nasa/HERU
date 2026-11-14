const GRID = [
  { y: 288, label: "0" },
  { y: 230.7, label: "50 mil" },
  { y: 173.5, label: "100 mil" },
  { y: 116.2, label: "150 mil" },
  { y: 59, label: "200 mil" },
];

const YEAR_TICKS: [x: number, year: number][] = [
  [56, 2003],
  [138.7, 2006],
  [221.4, 2009],
  [304.1, 2012],
  [386.8, 2015],
  [469.5, 2018],
  [552.2, 2021],
  [634.9, 2024],
];

const MODIS_ONLY =
  "56,263.1 83.6,243.7 111.1,246.4 138.7,261.9 166.3,241.2 193.8,268.9 221.4,270.5 249,239.2 276.5,268.4 304.1,267.6 331.7,267.9 359.2,272.5 386.8,274.2 414.3,259.1 441.9,267.5 469.5,271.6 497,243.6 524.6,242.2 552.2,259.8 579.7,262.6 607.3,249.9 634.9,234.5 662.4,265.7 690,258.2";

const RAW_SUM =
  "56,263.1 83.6,243.7 111.1,246.4 138.7,261.9 166.3,241.2 193.8,268.9 221.4,270.5 249,239.2 276.5,268.4 304.1,195.4 331.7,195.9 359.2,214.6 386.8,220.5 414.3,147.7 441.9,192.2 469.5,213.7 497,86.3 524.6,73.1 552.2,150.9 579.7,164.2 607.3,107.7 634.9,43.6 662.4,187.2 690,149.7";

const HARMONIZED =
  "56,191.3 83.6,121.5 111.1,138.7 138.7,196 166.3,118.9 193.8,215.6 221.4,219.7 249,101.9 276.5,216.7 304.1,215.9 331.7,216 359.2,230.1 386.8,234.3 414.3,176.6 441.9,212.7 469.5,230.1 497,130.7 524.6,118.9 552.2,179.1 579.7,189.6 607.3,145.8 634.9,97 662.4,209.5 690,179.5";

export function HarmonizationChart() {
  return (
    <figure className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="type-heading-sm text-ink">
          Antes e depois da harmonização · Bolívia
        </span>
        <span className="type-body-sm text-ink">
          Nesta área, 1 foco MODIS ≈ 3,7 focos VIIRS.
        </span>
      </figcaption>
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 840 320"
          role="img"
          aria-label="Linhas anuais da Bolívia, 2003 a 2026. A soma bruta de MODIS e VIIRS salta 4,7 vezes em 2012. A série harmonizada segue sem salto. O MODIS sozinho fica estável."
          className="block w-full min-w-[640px] font-ui"
        >
          <rect
            x="304.1"
            y="24"
            width="193"
            height="264"
            className="fill-viirs-adjusted/8"
          />
          <text
            x="400.6"
            y="280"
            fontSize="12"
            letterSpacing="1"
            textAnchor="middle"
            className="fill-viirs-adjusted"
          >
            ANOS DE CALIBRAÇÃO
          </text>
          {GRID.map(({ y, label }) => (
            <g key={label}>
              <line x1="56" x2="690" y1={y} y2={y} className="stroke-line" />
              <text
                x="46"
                y={y + 4}
                fontSize="12"
                textAnchor="end"
                className="fill-ink-muted"
              >
                {label}
              </text>
            </g>
          ))}
          <line
            x1="304.1"
            x2="304.1"
            y1="16"
            y2="288"
            strokeDasharray="3 4"
            className="stroke-ink"
          />
          <text
            x="312.1"
            y="28"
            fontSize="13"
            fontWeight="600"
            className="fill-ink"
          >
            2012: a soma bruta salta 4,7×
          </text>
          <text x="312.1" y="44" fontSize="12" className="fill-ink-muted">
            o VIIRS entra; o fogo não muda
          </text>
          <polyline
            points={MODIS_ONLY}
            fill="none"
            strokeWidth="1.5"
            strokeLinejoin="round"
            className="stroke-ink-muted"
          />
          <polyline
            points={RAW_SUM}
            fill="none"
            strokeWidth="2"
            strokeDasharray="6 5"
            strokeLinejoin="round"
            className="stroke-delta-above"
          />
          <polyline
            points={HARMONIZED}
            fill="none"
            strokeWidth="3"
            strokeLinejoin="round"
            className="stroke-ink"
          />
          <text
            x="700"
            y="147.7"
            fontSize="13"
            fontWeight="600"
            className="fill-delta-above"
          >
            Soma bruta
          </text>
          <text
            x="700"
            y="191.5"
            fontSize="13"
            fontWeight="600"
            className="fill-ink"
          >
            Harmonizada
          </text>
          <text x="700" y="262.2" fontSize="13" className="fill-ink-muted">
            Só MODIS
          </text>
          {YEAR_TICKS.map(([x, year]) => (
            <text
              key={year}
              x={x}
              y="310"
              fontSize="12"
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
