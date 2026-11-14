import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";

const CONFIDENCE_LEVELS: Record<
  "high" | "medium" | "low",
  { label: string; symbol: SymbolName; className: string }
> = {
  high: {
    label: "Confiança alta",
    symbol: "verified",
    className: "bg-status-live/14 text-confidence-high",
  },
  medium: {
    label: "Confiança média",
    symbol: "adjust",
    className: "bg-status-stale/12 text-status-stale",
  },
  low: {
    label: "Confiança baixa",
    symbol: "error",
    className: "bg-alert/14 text-delta-above",
  },
};

export function ConfidenceBadge({
  level,
}: {
  level: keyof typeof CONFIDENCE_LEVELS;
}) {
  const { label, symbol, className } = CONFIDENCE_LEVELS[level];
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-sm px-2 font-ui text-xs leading-4 font-semibold tracking-[0.06em] whitespace-nowrap uppercase ${className}`}
    >
      <MaterialSymbol name={symbol} className="size-4" />
      {label}
    </span>
  );
}
