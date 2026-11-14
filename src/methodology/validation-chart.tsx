const GRID = [
  { y: 212, label: "0" },
  { y: 174.1, label: "20 mil" },
  { y: 136.3, label: "40 mil" },
  { y: 98.4, label: "60 mil" },
  { y: 60.5, label: "80 mil" },
  { y: 22.7, label: "100 mil" },
];

const YEAR_TICKS: [x: number, year: number][] = [
  [52, 2020],
  [189.9, 2021],
  [327.8, 2022],
  [465.7, 2023],
  [603.6, 2024],
];

const RECONSTRUCTED =
  "52,210.1 63.5,210.8 75,210.3 86.5,210.6 98,208.9 109.5,206.9 120.9,196.6 132.4,147.7 143.9,65.5 155.4,184.7 166.9,207.2 178.4,208 189.9,210.2 201.4,211.3 212.9,210.9 224.4,209.9 235.9,209.4 247.4,206.1 258.8,195.5 270.3,155.4 281.8,155 293.3,190 304.8,206.2 316.3,208.6 327.8,210.7 339.3,210.8 350.8,211.4 362.3,210.7 373.8,208.9 385.3,207.8 396.7,204.7 408.2,172 419.7,145.4 431.2,187.3 442.7,208.5 454.2,208.7 465.7,209.6 477.2,211 488.7,211.2 500.2,210.4 511.7,209 523.2,205.1 534.6,198.8 546.1,156.1 557.6,108.4 569.1,175.2 580.6,207.1 592.1,208.7 603.6,210.5 615.1,210.2 626.6,210.7 638.1,210.4 649.6,209.6 661.1,204.2 672.5,190.6 684,160.5 695.5,55.9 707,174 718.5,206 730,203.7";

const OBSERVED =
  "52,210.2 63.5,210.8 75,210.4 86.5,210.5 98,208.9 109.5,207.4 120.9,195.6 132.4,149.6 143.9,63.5 155.4,181.8 166.9,207.7 178.4,208.1 189.9,210.4 201.4,211.3 212.9,210.8 224.4,210 235.9,209.3 247.4,206.1 258.8,197.2 270.3,149.4 281.8,154 293.3,190.8 304.8,205.8 316.3,209 327.8,210.6 339.3,210.8 350.8,211.4 362.3,210.5 373.8,209.1 385.3,207.8 396.7,204.5 408.2,174.7 419.7,137.6 431.2,186.9 442.7,208.8 454.2,208.5 465.7,209.9 477.2,211 488.7,211.2 500.2,210.4 511.7,208.7 523.2,205.7 534.6,199.3 546.1,150.7 557.6,113.2 569.1,172.8 580.6,207.1 592.1,209 603.6,210.4 615.1,210.4 626.6,210.6 638.1,210.3 649.6,209.8 661.1,203.8 672.5,192 684,161.3 695.5,33.8 707,176.4 718.5,206 730,203.6";

export function ValidationChart() {
  return (
    <figure className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="type-heading-sm text-ink">
          VIIRS observado e reconstruído · Bolívia, 2020-2024
        </span>
        <span className="type-body-sm text-ink">Erro mediano mensal: 9%</span>
      </figcaption>
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 840 240"
          role="img"
          aria-label="Focos mensais na Bolívia de 2020 a 2024: o VIIRS observado e o VIIRS reconstruído a partir do MODIS vezes k quase se sobrepõem. Erro mediano mensal de 9%."
          className="block w-full min-w-[640px] font-ui"
        >
          {GRID.map(({ y, label }) => (
            <g key={label}>
              <line x1="52" x2="730" y1={y} y2={y} className="stroke-line" />
              <text
                x="42"
                y={y + 4}
                fontSize="12"
                textAnchor="end"
                className="fill-ink-muted"
              >
                {label}
              </text>
            </g>
          ))}
          <polyline
            points={RECONSTRUCTED}
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            className="stroke-viirs-adjusted"
          />
          <polyline
            points={OBSERVED}
            fill="none"
            strokeWidth="2"
            className="stroke-ink"
          />
          {YEAR_TICKS.map(([x, year]) => (
            <text
              key={year}
              x={x}
              y="232"
              fontSize="12"
              className="fill-ink-muted"
            >
              {year}
            </text>
          ))}
          <text
            x="740"
            y="201.6"
            fontSize="13"
            fontWeight="600"
            className="fill-ink"
          >
            Observado
          </text>
          <text x="740" y="217.6" fontSize="13" className="fill-viirs-adjusted">
            Reconstruído
          </text>
        </svg>
      </div>
    </figure>
  );
}
