"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FireCalendarGrid } from "@/calendar/fire-calendar-grid";
import { useObservedWeek, type WeekCell } from "@/calendar/use-observed-week";
import { WeekDetail } from "@/calendar/week-detail";
import type { CalendarWeek, FireCalendar } from "@/harmonization/fire-calendar";
import { RegionFilter, type RegionOption } from "@/region-filter/region-filter";
import type { Region } from "@/regions/region-catalog";

const RegionMap = dynamic(
  () =>
    import("@/region-map/region-map").then((mapModule) => mapModule.RegionMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-neutral-100 dark:bg-neutral-900" />
    ),
  },
);

const NO_WEEK_CELLS: WeekCell[] = [];

export function RegionExplorer({
  region,
  regionOptions,
  calendar,
}: {
  region: Region;
  regionOptions: RegionOption[];
  calendar: FireCalendar | null;
}) {
  const [selectedWeek, setSelectedWeek] = useState<CalendarWeek | null>(
    calendar?.weeks.at(-1) ?? null,
  );
  const observedWeekState = useObservedWeek(calendar, selectedWeek);
  const weekCells =
    observedWeekState.status === "ready"
      ? observedWeekState.observedWeek.cells
      : NO_WEEK_CELLS;
  const selectedIndex =
    calendar && selectedWeek ? calendar.weeks.indexOf(selectedWeek) : -1;
  const neighborSelection = (offset: number) => {
    const neighbor = calendar?.weeks[selectedIndex + offset];
    return neighbor ? () => setSelectedWeek(neighbor) : null;
  };

  return (
    <main
      className={`mx-auto max-w-6xl px-4 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6 lg:pb-10 ${calendar ? "pb-[50vh]" : "pb-10"}`}
    >
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{region.name}</h1>
        <RegionFilter regionOptions={regionOptions} selectedRegion={region} />
        <div className="h-[45vh] overflow-hidden rounded-xl border border-neutral-200 lg:h-[28rem] dark:border-neutral-800">
          <RegionMap region={region} weekCells={weekCells} />
        </div>
        {calendar ? (
          <FireCalendarGrid
            calendar={calendar}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
          />
        ) : (
          <p className="text-neutral-600 dark:text-neutral-400">
            The fire calendar for {region.name} has not been built yet.
          </p>
        )}
      </div>
      {calendar && selectedWeek && (
        <WeekDetail
          week={selectedWeek}
          isFireSeason={calendar.fireSeason.includes(selectedWeek.week)}
          observedWeekState={observedWeekState}
          onPrevious={neighborSelection(-1)}
          onNext={neighborSelection(1)}
        />
      )}
    </main>
  );
}
