import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readFireCalendar } from "@/calendar/read-fire-calendar";
import { findRegion, regions } from "@/regions/region-catalog";
import { RegionExplorer } from "./region-explorer";

export const dynamicParams = false;

export function generateStaticParams() {
  return regions.map((region) => ({ regionId: region.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/regions/[regionId]">): Promise<Metadata> {
  const { regionId } = await params;
  return { title: `${findRegion(regionId)?.name} | Fire Calendar` };
}

export default async function RegionPage({
  params,
}: PageProps<"/regions/[regionId]">) {
  const { regionId } = await params;
  const region = findRegion(regionId);
  if (!region) {
    notFound();
  }
  const calendar = await readFireCalendar(region.id);
  const regionOptions = regions.map(({ id, name, kind }) => ({
    id,
    name,
    kind,
  }));

  return (
    <RegionExplorer
      region={region}
      regionOptions={regionOptions}
      calendar={calendar}
    />
  );
}
