import type { MultiPolygon, Polygon } from "geojson";
import pantanalShape from "./shapes/pantanal.json" with { type: "json" };
import punjabShape from "./shapes/punjab.json" with { type: "json" };

export type RegionKind = "country" | "state" | "biome";

export type Region = {
  id: string;
  name: string;
  kind: RegionKind;
  bounds: [west: number, south: number, east: number, north: number];
  shape: Polygon | MultiPolygon;
};

export const regions: Region[] = [
  {
    id: "pantanal",
    name: "Pantanal",
    kind: "biome",
    bounds: [-59.2, -22.2, -54.7, -15.6],
    shape: pantanalShape as Polygon,
  },
  {
    id: "punjab",
    name: "Punjab",
    kind: "state",
    bounds: [73.8, 29.5, 77.0, 32.6],
    shape: punjabShape as Polygon,
  },
];

export function findRegion(id: string): Region | undefined {
  return regions.find((region) => region.id === id);
}
