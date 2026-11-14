"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Region, RegionKind } from "@/regions/region-catalog";

export type RegionOption = Pick<Region, "id" | "name" | "kind">;

const REGION_KIND_NAMES: Record<RegionKind, string> = {
  country: "Country",
  state: "State",
  biome: "Biome",
};

export function RegionFilter({
  regionOptions,
  selectedRegion,
}: {
  regionOptions: RegionOption[];
  selectedRegion: RegionOption;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<RegionKind>(selectedRegion.kind);
  const kinds = [...new Set(regionOptions.map((option) => option.kind))];
  const optionsOfKind = regionOptions.filter((option) => option.kind === kind);
  const selectedInKind = optionsOfKind.some(
    (option) => option.id === selectedRegion.id,
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div
        role="group"
        aria-label="Region type"
        className="flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900"
      >
        {kinds.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={kind === option}
            onClick={() => setKind(option)}
            className="min-h-11 flex-1 rounded-md px-4 text-sm font-medium text-neutral-600 aria-pressed:bg-white aria-pressed:text-neutral-950 aria-pressed:shadow-sm dark:text-neutral-400 dark:aria-pressed:bg-neutral-800 dark:aria-pressed:text-white"
          >
            {REGION_KIND_NAMES[option]}
          </button>
        ))}
      </div>
      <select
        aria-label={REGION_KIND_NAMES[kind]}
        value={selectedInKind ? selectedRegion.id : ""}
        onChange={(event) => router.push(`/regions/${event.target.value}`)}
        className="min-h-11 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
      >
        {!selectedInKind && (
          <option value="" disabled>
            Choose a {REGION_KIND_NAMES[kind].toLowerCase()}
          </option>
        )}
        {optionsOfKind.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
