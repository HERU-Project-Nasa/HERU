import type { Position } from "geojson";
import type { Region } from "./region-catalog.ts";

export function contains(
  region: Region,
  latitude: number,
  longitude: number,
): boolean {
  const [west, south, east, north] = region.bounds;
  if (
    longitude < west ||
    longitude > east ||
    latitude < south ||
    latitude > north
  ) {
    return false;
  }
  const polygons =
    region.shape.type === "Polygon"
      ? [region.shape.coordinates]
      : region.shape.coordinates;
  return polygons.some((rings) => polygonContains(rings, longitude, latitude));
}

function polygonContains(
  [outerRing, ...holes]: Position[][],
  x: number,
  y: number,
): boolean {
  return (
    ringContains(outerRing, x, y) &&
    !holes.some((hole) => ringContains(hole, x, y))
  );
}

function ringContains(ring: Position[], x: number, y: number): boolean {
  let inside = false;
  for (
    let current = 0, previous = ring.length - 1;
    current < ring.length;
    previous = current++
  ) {
    const [currentX, currentY] = ring[current];
    const [previousX, previousY] = ring[previous];
    const crossesRay =
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) / (previousY - currentY) +
          currentX;
    if (crossesRay) {
      inside = !inside;
    }
  }
  return inside;
}
