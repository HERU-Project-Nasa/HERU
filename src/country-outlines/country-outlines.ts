import type { FeatureCollection, MultiPolygon, Position } from "geojson";
import { useEffect, useState } from "react";

export type CountryOutline = {
  path: string;
  areaKm2: number;
  bounds: [west: number, south: number, east: number, north: number];
};

export type CountryOutlines = Record<string, CountryOutline>;

export const COUNTRY_BOUNDARIES_URL = "/geo/countries.geojson";
const COUNTRY_OUTLINES_URL = "/geo/country-outlines.json";

let outlinesRequest: Promise<CountryOutlines> | null = null;
let boundariesRequest: Promise<FeatureCollection<MultiPolygon>> | null = null;

export async function loadCountryShape(
  code: string,
): Promise<MultiPolygon | null> {
  boundariesRequest ??= fetch(COUNTRY_BOUNDARIES_URL).then((response) => {
    if (!response.ok) {
      throw new Error(`${response.status} ${COUNTRY_BOUNDARIES_URL}`);
    }
    return response.json() as Promise<FeatureCollection<MultiPolygon>>;
  });
  boundariesRequest.catch(() => {
    boundariesRequest = null;
  });
  const boundaries = await boundariesRequest;
  return (
    boundaries.features.find((feature) => feature.properties?.code === code)
      ?.geometry ?? null
  );
}

function insideRing(longitude: number, latitude: number, ring: Position[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function insideShape(
  longitude: number,
  latitude: number,
  shape: MultiPolygon,
): boolean {
  return shape.coordinates.some(
    ([outer, ...holes]) =>
      insideRing(longitude, latitude, outer) &&
      !holes.some((hole) => insideRing(longitude, latitude, hole)),
  );
}

export type ShapeCells = { shape: MultiPolygon; edgeCells: Set<string> };

function cellKey(latitude: number, longitude: number, size: number): string {
  return `${Math.floor(latitude / size)}:${Math.floor(longitude / size)}`;
}

export function shapeCells(shape: MultiPolygon, size: number): ShapeCells {
  const edgeCells = new Set<string>();
  const step = size / 5;
  for (const polygon of shape.coordinates) {
    for (const ring of polygon) {
      for (let index = 1; index < ring.length; index++) {
        const [fromLongitude, fromLatitude] = ring[index - 1];
        const [toLongitude, toLatitude] = ring[index];
        const samples = Math.max(
          1,
          Math.ceil(
            Math.max(
              Math.abs(toLongitude - fromLongitude),
              Math.abs(toLatitude - fromLatitude),
            ) / step,
          ),
        );
        for (let sample = 0; sample <= samples; sample++) {
          const share = sample / samples;
          edgeCells.add(
            cellKey(
              fromLatitude + (toLatitude - fromLatitude) * share,
              fromLongitude + (toLongitude - fromLongitude) * share,
              size,
            ),
          );
        }
      }
    }
  }
  return { shape, edgeCells };
}

export function cellTouchesShape(
  latitude: number,
  longitude: number,
  size: number,
  { shape, edgeCells }: ShapeCells,
): boolean {
  return (
    edgeCells.has(cellKey(latitude, longitude, size)) ||
    insideShape(longitude, latitude, shape)
  );
}

function loadCountryOutlines(): Promise<CountryOutlines> {
  outlinesRequest ??= fetch(COUNTRY_OUTLINES_URL).then((response) => {
    if (!response.ok) {
      throw new Error(`${response.status} ${COUNTRY_OUTLINES_URL}`);
    }
    return response.json() as Promise<CountryOutlines>;
  });
  outlinesRequest.catch(() => {
    outlinesRequest = null;
  });
  return outlinesRequest;
}

export function useCountryOutlines(): CountryOutlines | null {
  const [outlines, setOutlines] = useState<CountryOutlines | null>(null);
  useEffect(() => {
    let current = true;
    loadCountryOutlines().then(
      (loaded) => {
        if (current) {
          setOutlines(loaded);
        }
      },
      () => {},
    );
    return () => {
      current = false;
    };
  }, []);
  return outlines;
}

const AREA = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const SMALL_AREA = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

export function formatArea(areaKm2: number): string {
  return `${(areaKm2 < 10 ? SMALL_AREA : AREA).format(areaKm2)} km²`;
}

export const AREA_SOURCES: Record<string, string> = {
  world_bank: "área de terra, Banco Mundial",
  cgaz: "área das fronteiras (CGAZ), com lagos e rios",
};
