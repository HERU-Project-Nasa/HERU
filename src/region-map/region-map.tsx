"use client";

import type { FeatureCollection, Polygon } from "geojson";
import { type GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { ACTIVITY_PALETTE } from "@/calendar/activity-color";
import type { WeekCell } from "@/calendar/use-observed-week";
import type { Region } from "@/regions/region-catalog";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const EXTRUSION_METERS_PER_ACTIVE_DAY = 2500;
const REGION_COLOR = "#c2410c";
const EMPTY_COLLECTION: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function RegionMap({
  region,
  weekCells,
}: {
  region: Region;
  weekCells: WeekCell[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    const instance = new MapLibreMap({
      container: containerRef.current!,
      style: MAP_STYLE,
      center: [0, 0],
      zoom: 1,
      pitch: 0,
      maxPitch: 70,
      attributionControl: { compact: true },
    });
    instance.on("style.load", () => {
      instance.setProjection({ type: "globe" });
      instance.addSource("region", { type: "geojson", data: EMPTY_COLLECTION });
      instance.addSource("week-cells", {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });
      instance.addLayer({
        id: "region-fill",
        type: "fill",
        source: "region",
        paint: { "fill-color": REGION_COLOR, "fill-opacity": 0.08 },
      });
      instance.addLayer({
        id: "region-outline",
        type: "line",
        source: "region",
        paint: { "line-color": REGION_COLOR, "line-width": 1.5 },
      });
      instance.addLayer({
        id: "week-cells",
        type: "fill-extrusion",
        source: "week-cells",
        paint: {
          "fill-extrusion-color": [
            "step",
            ["get", "activeDays"],
            ACTIVITY_PALETTE[0],
            2,
            ACTIVITY_PALETTE[1],
            3,
            ACTIVITY_PALETTE[2],
            4,
            ACTIVITY_PALETTE[3],
            5,
            ACTIVITY_PALETTE[4],
            6,
            ACTIVITY_PALETTE[5],
            7,
            ACTIVITY_PALETTE[6],
          ],
          "fill-extrusion-height": [
            "*",
            ["get", "activeDays"],
            EXTRUSION_METERS_PER_ACTIVE_DAY,
          ],
          "fill-extrusion-opacity": 0.9,
        },
      });
      setMap(instance);
    });
    return () => instance.remove();
  }, []);

  useEffect(() => {
    if (!map) {
      return;
    }
    map.getSource<GeoJSONSource>("region")?.setData({
      type: "Feature",
      geometry: region.shape,
      properties: {},
    });
    const [west, south, east, north] = region.bounds;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 32, pitch: 50, duration: 2500 },
    );
  }, [map, region]);

  useEffect(() => {
    map
      ?.getSource<GeoJSONSource>("week-cells")
      ?.setData(cellCollection(weekCells));
  }, [map, weekCells]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Map of ${region.name} with the active cells of the selected week`}
      className="h-full w-full"
    />
  );
}

function cellCollection(
  weekCells: WeekCell[],
): FeatureCollection<Polygon, { activeDays: number }> {
  return {
    type: "FeatureCollection",
    features: weekCells.map(
      ({ bounds: [west, south, east, north], activeDays }) => ({
        type: "Feature",
        properties: { activeDays },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          ],
        },
      }),
    ),
  };
}
