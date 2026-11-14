import type { CalendarWeek } from "./fire-calendar.ts";
import { percentile, roundTo } from "./statistics.ts";

const EXPECTED_PERCENTILE = 0.5;
const UPPER_BOUND_PERCENTILE = 0.9;
const FIRE_SEASON_PERCENTILE = 0.75;
const CELL_DAY_DECIMALS = 1;

export type WeekObservation = Omit<
  CalendarWeek,
  "expected" | "upperBound" | "anomaly"
>;

type WeekBaseline = Pick<CalendarWeek, "expected" | "upperBound">;

export function compareWithBaseline(observations: WeekObservation[]): {
  weeks: CalendarWeek[];
  fireSeason: number[];
} {
  const roundedObservations = observations.map((observation) => ({
    ...observation,
    harmonizedCellDays: roundTo(
      observation.harmonizedCellDays,
      CELL_DAY_DECIMALS,
    ),
  }));

  const valuesByWeek = new Map<number, number[]>();
  for (const observation of roundedObservations) {
    const values = valuesByWeek.get(observation.week) ?? [];
    values.push(observation.harmonizedCellDays);
    valuesByWeek.set(observation.week, values);
  }

  const baselineByWeek = new Map<number, WeekBaseline>();
  for (const [week, values] of valuesByWeek) {
    const sortedValues = values.sort((first, second) => first - second);
    baselineByWeek.set(week, {
      expected: roundTo(
        percentile(sortedValues, EXPECTED_PERCENTILE),
        CELL_DAY_DECIMALS,
      ),
      upperBound: roundTo(
        percentile(sortedValues, UPPER_BOUND_PERCENTILE),
        CELL_DAY_DECIMALS,
      ),
    });
  }

  const weeks = roundedObservations.map((observation) => {
    const baseline = baselineByWeek.get(observation.week)!;
    return {
      ...observation,
      ...baseline,
      anomaly: observation.harmonizedCellDays > baseline.upperBound,
    };
  });

  return { weeks, fireSeason: fireSeasonWeeks(baselineByWeek) };
}

function fireSeasonWeeks(baselineByWeek: Map<number, WeekBaseline>): number[] {
  const sortedMedians = [...baselineByWeek.values()]
    .map(({ expected }) => expected)
    .sort((first, second) => first - second);
  const threshold = percentile(sortedMedians, FIRE_SEASON_PERCENTILE);
  return [...baselineByWeek]
    .filter(([, { expected }]) => expected > 0 && expected >= threshold)
    .map(([week]) => week)
    .sort((first, second) => first - second);
}
