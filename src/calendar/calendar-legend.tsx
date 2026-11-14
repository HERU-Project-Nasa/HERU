import { ACTIVITY_PALETTE } from "./activity-color";

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-600 dark:text-neutral-400">
      <div className="flex items-center gap-1.5">
        <span>Fewer</span>
        <span className="flex">
          {ACTIVITY_PALETTE.map((color) => (
            <span
              key={color}
              className="size-3"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
        <span>More cell-days</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-[2px] bg-neutral-200 ring-1 ring-neutral-950 ring-inset dark:bg-neutral-800 dark:ring-white" />
        <span>Anomaly</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-[2px] bg-orange-200 dark:bg-orange-900" />
        <span>Fire season</span>
      </div>
    </div>
  );
}
