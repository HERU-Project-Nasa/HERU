export const ACTIVITY_PALETTE = [
  "#ffeda0",
  "#fed976",
  "#feb24c",
  "#fd8d3c",
  "#fc4e2a",
  "#e31a1c",
  "#b10026",
] as const;

export function activityColor(
  cellDays: number,
  maximumCellDays: number,
): string | undefined {
  if (cellDays <= 0) {
    return undefined;
  }
  const level = Math.floor(
    (Math.log1p(cellDays) / Math.log1p(maximumCellDays)) *
      ACTIVITY_PALETTE.length,
  );
  return ACTIVITY_PALETTE[Math.min(level, ACTIVITY_PALETTE.length - 1)];
}
