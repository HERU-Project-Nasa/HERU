export function percentile(sortedValues: number[], fraction: number): number {
  const position = (sortedValues.length - 1) * fraction;
  const lower = sortedValues[Math.floor(position)];
  const upper = sortedValues[Math.ceil(position)];
  return lower + (upper - lower) * (position - Math.floor(position));
}

export function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}
