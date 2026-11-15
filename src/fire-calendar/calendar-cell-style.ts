export const HEAT_TOKENS = [
  "heat-6",
  "heat-5",
  "heat-4",
  "heat-3",
  "heat-2",
  "heat-1",
] as const;

export const HEAT_BACKGROUNDS = [
  "bg-heat-6",
  "bg-heat-5",
  "bg-heat-4",
  "bg-heat-3",
  "bg-heat-2",
  "bg-heat-1",
];

export const HATCH =
  "repeating-linear-gradient(135deg, rgba(52, 52, 58, 0.7) 0 2px, transparent 2px 6px)";

export const LIGHT_HATCH =
  "repeating-linear-gradient(135deg, rgba(52, 52, 58, 0.35) 0 2px, transparent 2px 6px)";

export const PARTIAL_STRIPES =
  "repeating-linear-gradient(135deg, rgba(10, 10, 11, 0) 0 4px, rgba(10, 10, 11, 0.55) 4px 6px)";

export const OUTLIER_RING =
  "inset 0 0 0 1.5px var(--color-ink), 0 0 0 1px var(--color-surface-ground)";

export const SENSOR_BACKGROUNDS = {
  modis: "bg-modis",
  viirs: "bg-viirs",
} as const;
