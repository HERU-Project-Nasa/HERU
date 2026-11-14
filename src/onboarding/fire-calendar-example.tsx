import {
  ILLUSTRATIVE_CALENDAR,
  ILLUSTRATIVE_OUT_OF_PATTERN,
  ILLUSTRATIVE_PARTIAL_MONTH,
} from "./illustrative-calendar";

const MONTHS = [
  ["janeiro", "jan"],
  ["fevereiro", "fev"],
  ["março", "mar"],
  ["abril", "abr"],
  ["maio", "mai"],
  ["junho", "jun"],
  ["julho", "jul"],
  ["agosto", "ago"],
  ["setembro", "set"],
  ["outubro", "out"],
  ["novembro", "nov"],
  ["dezembro", "dez"],
];

const HEAT_SCALE = [
  { limit: 1, label: "0", className: "border border-line bg-heat-0" },
  { limit: 1_000, label: "< 1 mil", className: "bg-heat-1" },
  { limit: 3_000, label: "1-3 mil", className: "bg-heat-2" },
  { limit: 10_000, label: "3-10 mil", className: "bg-heat-3" },
  { limit: 30_000, label: "10-30 mil", className: "bg-heat-4" },
  { limit: 100_000, label: "30-100 mil", className: "bg-heat-5" },
  { limit: Infinity, label: "≥ 100 mil", className: "bg-heat-6" },
];

const ROW_CLASS_NAME =
  "grid grid-cols-[36px_repeat(12,minmax(0,1fr))] items-center gap-0.5 sm:grid-cols-[44px_repeat(12,minmax(0,1fr))] sm:gap-1";
const OUT_OF_PATTERN_RING =
  "shadow-[inset_0_0_0_1.5px_var(--color-ink),0_0_0_1px_var(--color-surface-ground)]";
const IN_PROGRESS_STRIPES =
  "bg-[repeating-linear-gradient(135deg,rgba(10,10,11,0)_0_4px,rgba(10,10,11,0.55)_4px_6px)]";
const COUNT_FORMAT = new Intl.NumberFormat("pt-BR");

export function FireCalendarExample() {
  return (
    <figure className="rounded-xl border border-line bg-surface px-5 py-6 sm:px-10 sm:py-8">
      <figcaption>
        <p className="type-heading-sm text-ink">Brasil, 2015-2026</p>
        <p className="type-caption mt-1 text-ink-muted">
          Focos por mês · equivalente VIIRS
        </p>
      </figcaption>
      <div
        role="table"
        aria-label="Calendário de fogo, focos por mês"
        className="mt-5 flex flex-col gap-0.5 sm:gap-1"
      >
        <div role="row" className={`${ROW_CLASS_NAME} mb-1 sm:mb-2`}>
          <span role="columnheader">
            <span className="sr-only">Ano</span>
          </span>
          {MONTHS.map(([name, abbreviation]) => (
            <span
              key={name}
              role="columnheader"
              aria-label={name}
              className="type-caption text-center text-ink-muted"
            >
              <span className="sm:hidden">{abbreviation[0]}</span>
              <span className="max-sm:hidden">{abbreviation}</span>
            </span>
          ))}
        </div>
        {ILLUSTRATIVE_CALENDAR.map(({ year, monthlyCounts }) => (
          <div key={year} role="row" className={ROW_CLASS_NAME}>
            <span
              role="rowheader"
              className="type-caption tracking-[0.06em] text-ink-muted tabular-nums"
            >
              {year}
            </span>
            {monthlyCounts.map((count, month) => (
              <MonthCell key={month} year={year} month={month} count={count} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="type-caption text-ink-muted">Focos por mês</span>
          <ul className="grid grid-cols-4 gap-1 sm:grid-cols-7">
            {HEAT_SCALE.map((step) => (
              <li key={step.label} className="flex min-w-0 flex-col gap-1.5">
                <span
                  aria-hidden="true"
                  className={`h-3 rounded-xs ${step.className}`}
                />
                <span className="font-ui text-xs leading-4 whitespace-nowrap text-ink-muted tabular-nums">
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <ul className="type-body-sm flex flex-wrap gap-x-6 gap-y-2 text-ink">
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`relative h-4 w-7 rounded-xs bg-heat-6 ${OUT_OF_PATTERN_RING}`}
            >
              <OutOfPatternDot />
            </span>
            Fora do padrão
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-4 w-7 rounded-xs bg-heat-3 ${IN_PROGRESS_STRIPES}`}
            />
            Mês em andamento
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-4 w-7 rounded-xs border border-dashed border-line"
            />
            Sem dados ainda
          </li>
        </ul>
      </div>
    </figure>
  );
}

function MonthCell({
  year,
  month,
  count,
}: {
  year: number;
  month: number;
  count: number | null;
}) {
  const monthName = `${MONTHS[month][0]} de ${year}`;
  if (count === null) {
    return (
      <span
        role="cell"
        aria-label={`${monthName}: sem dados ainda`}
        className="h-4 rounded-xs border border-dashed border-line sm:h-[22px]"
      />
    );
  }
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const outOfPattern = ILLUSTRATIVE_OUT_OF_PATTERN.includes(monthKey);
  const inProgress = monthKey === ILLUSTRATIVE_PARTIAL_MONTH;
  const heat = HEAT_SCALE.find((step) => count < step.limit)!;
  const label = `${monthName}: ${COUNT_FORMAT.format(count)} focos${outOfPattern ? ", fora do padrão" : ""}${inProgress ? ", parcial" : ""}`;
  return (
    <span
      role="cell"
      aria-label={label}
      className={`relative h-4 rounded-xs sm:h-[22px] ${heat.className} ${outOfPattern ? OUT_OF_PATTERN_RING : ""} ${inProgress ? IN_PROGRESS_STRIPES : ""}`}
    >
      {outOfPattern && <OutOfPatternDot />}
    </span>
  );
}

function OutOfPatternDot() {
  return (
    <span className="absolute top-0.5 right-0.5 size-1 rounded-full bg-ink shadow-[0_0_0_1px_var(--color-surface-ground)] sm:top-[3px] sm:right-[3px]" />
  );
}
