export type CalendarMode = "count" | "anomaly";

export const CALENDAR_MODES: { value: CalendarMode; label: string }[] = [
  { value: "count", label: "Contagem" },
  { value: "anomaly", label: "Anomalia" },
];

export const ANOMALY_LEVELS = [
  { below: 0.5, className: "bg-delta-below", label: "< 0,5×" },
  { below: 0.8, className: "bg-viirs", label: "0,5-0,8×" },
  { below: 1.25, className: "border border-line bg-heat-0", label: "típico" },
  { below: 2, className: "bg-heat-2", label: "1,25-2×" },
  { below: 3, className: "bg-heat-3", label: "2-3×" },
  { below: Infinity, className: "bg-delta-above", label: "> 3×" },
];

export const TYPICAL_LEVEL = 2;

export function anomalyLevel(value: number, median: number): number {
  const ratio = median > 0 ? value / median : value > 0 ? Infinity : 1;
  if (ratio < 0.5) return 0;
  if (ratio < 0.8) return 1;
  if (ratio <= 1.25) return 2;
  if (ratio <= 2) return 3;
  if (ratio <= 3) return 4;
  return 5;
}
