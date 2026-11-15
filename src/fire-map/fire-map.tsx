"use client";

import type { Feature, FeatureCollection, Point } from "geojson";
import {
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { COUNTRY_BOUNDARIES_URL } from "@/country-outlines/country-outlines";
import { HEAT_TOKENS } from "@/fire-calendar/calendar-cell-style";
import { heatLevel } from "@/fire-calendar/calendar-statistics";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import type { MappedPoint } from "./use-map-fires";
import type { AreaBounds, FireCell } from "./period-fires";

export type MapTooltip =
  { kind: "point"; point: MappedPoint } | { kind: "cell"; cell: FireCell };

type HoverPlace = { tooltip: MapTooltip; x: number; y: number };

const TOOLTIP_WIDTH = 264;
const FIT_PADDING = 120;
const FIT_MAX_ZOOM = 6;
const WORLD_VIEW = { center: [0, 15] as [number, number], zoom: 1.6 };
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

function themeColor(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${name}`)
    .trim();
}

function showArea(
  map: MapLibreMap,
  bounds: AreaBounds | null,
  duration: number,
) {
  if (!bounds) {
    map.easeTo({ ...WORLD_VIEW, duration });
    return;
  }
  const width = map.getContainer().clientWidth;
  map.fitBounds(
    [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ],
    {
      padding: Math.min(FIT_PADDING, width / 8),
      maxZoom: FIT_MAX_ZOOM,
      duration,
    },
  );
}

function pointCollection(points: MappedPoint[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: points.map((point, index): Feature<Point> => ({
      type: "Feature",
      id: index,
      properties: { index, active: point.active },
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude],
      },
    })),
  };
}

function cellCollection(
  cells: FireCell[],
  breaks: number[],
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: cells.map((cell, index): Feature<Point> => ({
      type: "Feature",
      id: index,
      properties: { index, level: heatLevel(cell.count, breaks) },
      geometry: {
        type: "Point",
        coordinates: [cell.longitude, cell.latitude],
      },
    })),
  };
}

const LEVEL_SIZE: ExpressionSpecification = [
  "+",
  0.7,
  ["*", 0.08, ["get", "level"]],
];

function dotRadius(scale: number): ExpressionSpecification {
  return [
    "interpolate",
    ["exponential", 2],
    ["zoom"],
    2,
    ["*", 0.9 * scale, LEVEL_SIZE],
    5,
    ["*", 2.6 * scale, LEVEL_SIZE],
    7,
    ["*", 8 * scale, LEVEL_SIZE],
    10,
    ["*", 40 * scale, LEVEL_SIZE],
  ];
}

const SATELLITE_TILES =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";

type MapLook = "sketch" | "realistic";

const MAP_LOOKS: { value: MapLook; label: string; icon: SymbolName }[] = [
  { value: "sketch", label: "Esboço", icon: "map" },
  { value: "realistic", label: "Realista", icon: "satellite_alt" },
];

function applyMapLook(map: MapLibreMap, look: MapLook) {
  const realistic = look === "realistic";
  map.setLayoutProperty(
    "satellite",
    "visibility",
    realistic ? "visible" : "none",
  );
  map.setPaintProperty("land", "fill-opacity", realistic ? 0 : 1);
  map.setPaintProperty("area-fill", "fill-opacity", realistic ? 0.28 : 1);
  map.setPaintProperty(
    "borders",
    "line-color",
    realistic ? "rgba(255, 255, 255, 0.35)" : themeColor("globe-border"),
  );
}

function MapLookToggle({
  look,
  onChange,
}: {
  look: MapLook;
  onChange: (look: MapLook) => void;
}) {
  return (
    <div className="absolute right-4 bottom-4 z-10 flex flex-col items-end gap-1.5">
      <div
        role="radiogroup"
        aria-label="Visual do mapa"
        className="flex items-center gap-0.5 rounded-full border border-line-strong bg-surface/85 p-1 shadow-overlay backdrop-blur-md"
      >
        {MAP_LOOKS.map((option) => {
          const checked = option.value === look;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(option.value)}
              className={`type-chip flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 transition-colors duration-200 ease-standard ${checked ? "bg-selected font-semibold text-ink-inverse" : "text-ink hover:bg-surface-hover"}`}
            >
              <MaterialSymbol name={option.icon} className="size-4" />
              {option.label}
            </button>
          );
        })}
      </div>
      {look === "realistic" && (
        <span className="rounded-sm bg-surface-ground/70 px-1.5 py-0.5 text-[11px] leading-4 text-ink-muted">
          Imagens: NASA GIBS, Blue Marble
        </span>
      )}
    </div>
  );
}

function ControlButton({
  label,
  icon,
  onClick,
  pressed,
}: {
  label: string;
  icon: SymbolName;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="flex size-10 cursor-pointer items-center justify-center rounded-sm border border-line-strong bg-surface-raised text-ink transition-colors duration-120 ease-standard hover:border-ink"
    >
      <MaterialSymbol name={icon} className="size-5" />
    </button>
  );
}

export function FireMap({
  label,
  area,
  bounds,
  points,
  cells,
  cellBreaks,
  renderTooltip,
  children,
}: {
  label: string;
  area: string | null;
  bounds: AreaBounds | null;
  points: MappedPoint[];
  cells: FireCell[];
  cellBreaks: number[];
  renderTooltip: (tooltip: MapTooltip) => ReactNode;
  children: ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [globe, setGlobe] = useState(true);
  const [look, setLook] = useState<MapLook>("sketch");
  const [fullscreen, setFullscreen] = useState(false);
  const [hover, setHover] = useState<HoverPlace | null>(null);
  const pointsRef = useRef(points);
  const cellsRef = useRef(cells);

  useEffect(() => {
    pointsRef.current = points;
    cellsRef.current = cells;
  }, [points, cells]);

  useEffect(() => {
    const heat = (level: number) => themeColor(HEAT_TOKENS[level - 1]);
    const heatColor: ExpressionSpecification = [
      "match",
      ["get", "level"],
      1,
      heat(1),
      2,
      heat(2),
      3,
      heat(3),
      4,
      heat(4),
      5,
      heat(5),
      heat(6),
    ];
    const instance = new MapLibreMap({
      container: canvasRef.current!,
      style: {
        version: 8,
        projection: { type: "globe" },
        sky: {
          "atmosphere-blend": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.8,
            5,
            0.6,
            7,
            0,
          ],
        },
        sources: {
          countries: { type: "geojson", data: COUNTRY_BOUNDARIES_URL },
          satellite: {
            type: "raster",
            tiles: [SATELLITE_TILES],
            tileSize: 256,
            maxzoom: 8,
          },
          cells: { type: "geojson", data: EMPTY },
          points: { type: "geojson", data: EMPTY },
        },
        layers: [
          {
            id: "ocean",
            type: "background",
            paint: { "background-color": themeColor("globe-ocean") },
          },
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
            layout: { visibility: "none" },
            paint: { "raster-fade-duration": 300 },
          },
          {
            id: "land",
            type: "fill",
            source: "countries",
            paint: { "fill-color": themeColor("globe-land") },
          },
          {
            id: "area-fill",
            type: "fill",
            source: "countries",
            filter: ["==", ["get", "code"], ""],
            paint: { "fill-color": themeColor("region-fill") },
          },
          {
            id: "borders",
            type: "line",
            source: "countries",
            paint: {
              "line-color": themeColor("globe-border"),
              "line-width": 0.5,
            },
          },
          {
            id: "cells",
            type: "circle",
            source: "cells",
            paint: {
              "circle-color": heatColor,
              "circle-radius": dotRadius(2.6),
              "circle-blur": 1,
              "circle-opacity": 0.5,
            },
          },
          {
            id: "cells-core",
            type: "circle",
            source: "cells",
            paint: {
              "circle-color": heatColor,
              "circle-radius": dotRadius(1),
              "circle-stroke-color": heatColor,
              "circle-stroke-width": dotRadius(0.45),
              "circle-stroke-opacity": 0.3,
            },
          },
          {
            id: "area-line",
            type: "line",
            source: "countries",
            filter: ["==", ["get", "code"], ""],
            paint: {
              "line-color": themeColor("region-line"),
              "line-width": 1.5,
            },
          },
          {
            id: "points",
            type: "circle",
            source: "points",
            filter: ["!", ["get", "active"]],
            paint: {
              "circle-color": themeColor("data-burned"),
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                2,
                2,
                7,
                4,
              ],
              "circle-stroke-color": themeColor("surface-ground"),
              "circle-stroke-width": 0.5,
            },
          },
          {
            id: "active-halo",
            type: "circle",
            source: "points",
            filter: ["get", "active"],
            paint: {
              "circle-color": "rgba(0, 0, 0, 0)",
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                2,
                5,
                7,
                9,
              ],
              "circle-stroke-color": themeColor("data-active"),
              "circle-stroke-width": 1.5,
              "circle-stroke-opacity": 0.8,
            },
          },
          {
            id: "active-points",
            type: "circle",
            source: "points",
            filter: ["get", "active"],
            paint: {
              "circle-color": themeColor("data-active"),
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                2,
                1.5,
                7,
                3,
              ],
            },
          },
        ],
      },
      center: WORLD_VIEW.center,
      zoom: WORLD_VIEW.zoom,
      attributionControl: false,
      renderWorldCopies: false,
    });
    const place = (event: MapLayerMouseEvent) => ({
      x: Math.max(
        8,
        Math.min(
          event.point.x + 16,
          (stageRef.current?.clientWidth ?? 0) - TOOLTIP_WIDTH - 8,
        ),
      ),
      y: Math.max(8, event.point.y - 24),
    });
    const showPoint = (event: MapLayerMouseEvent) => {
      const index = event.features?.[0]?.properties?.index;
      const point = pointsRef.current[index];
      if (point) {
        setHover({ tooltip: { kind: "point", point }, ...place(event) });
      }
    };
    const showCell = (event: MapLayerMouseEvent) => {
      const index = event.features?.[0]?.properties?.index;
      const cell = cellsRef.current[index];
      if (cell) {
        setHover({ tooltip: { kind: "cell", cell }, ...place(event) });
      }
    };
    const hide = () => setHover(null);
    const pointLayers = ["points", "active-points", "active-halo"];
    instance.on("mousemove", pointLayers, showPoint);
    instance.on("click", pointLayers, showPoint);
    instance.on("mouseleave", pointLayers, hide);
    instance.on("mousemove", "cells", showCell);
    instance.on("click", "cells", showCell);
    instance.on("mouseleave", "cells", hide);
    instance.on("movestart", hide);
    instance.on("load", () => setMap(instance));
    const leaveFullscreen = () =>
      setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", leaveFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", leaveFullscreen);
      instance.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) {
      return;
    }
    const filter = [
      "==",
      ["get", "code"],
      area ?? "",
    ] as ExpressionSpecification;
    map.setFilter("area-fill", filter);
    map.setFilter("area-line", filter);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 1200;
    showArea(map, bounds, duration);
  }, [map, area, bounds]);

  useEffect(() => {
    map?.getSource<GeoJSONSource>("points")?.setData(pointCollection(points));
  }, [map, points]);

  useEffect(() => {
    map
      ?.getSource<GeoJSONSource>("cells")
      ?.setData(cellCollection(cells, cellBreaks));
  }, [map, cells, cellBreaks]);

  const recenter = () => {
    if (map) {
      showArea(map, bounds, 600);
    }
  };

  const changeLook = (next: MapLook) => {
    setLook(next);
    if (map) {
      applyMapLook(map, next);
    }
  };

  const toggleProjection = () => {
    map?.setProjection({ type: globe ? "mercator" : "globe" });
    setGlobe(!globe);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      stageRef.current?.requestFullscreen();
    }
  };

  return (
    <div
      ref={stageRef}
      className="relative h-[520px] overflow-hidden rounded-lg border border-line bg-surface-ground sm:h-[600px]"
    >
      <div className="absolute inset-0">
        <div
          ref={canvasRef}
          role="img"
          aria-label={label}
          className="h-full w-full"
        />
      </div>
      {children}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <ControlButton
          label="Aproximar"
          icon="add"
          onClick={() => map?.zoomIn()}
        />
        <ControlButton
          label="Afastar"
          icon="remove"
          onClick={() => map?.zoomOut()}
        />
        <ControlButton
          label="Voltar para a região"
          icon="my_location"
          onClick={recenter}
        />
        <ControlButton
          label={globe ? "Ver como mapa plano" : "Ver como globo"}
          icon={globe ? "map" : "view_in_ar"}
          onClick={toggleProjection}
        />
        <ControlButton
          label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          icon={fullscreen ? "fullscreen_exit" : "fullscreen"}
          onClick={toggleFullscreen}
        />
      </div>
      <MapLookToggle look={look} onChange={changeLook} />
      {hover && (
        <div
          className="pointer-events-none absolute z-30"
          style={{ left: hover.x, top: hover.y }}
        >
          {renderTooltip(hover.tooltip)}
        </div>
      )}
    </div>
  );
}
