import { describe, expect, it } from "vitest";
import { contains } from "./contains.ts";
import { findRegion, regions, type Region } from "./region-catalog.ts";

const squareWithHole: Region = {
  id: "square",
  name: "Square",
  kind: "state",
  bounds: [0, 0, 10, 10],
  shape: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      [
        [4, 4],
        [6, 4],
        [6, 6],
        [4, 6],
        [4, 4],
      ],
    ],
  },
};

describe("contains", () => {
  it("accepts points inside the outer ring", () => {
    expect(contains(squareWithHole, 2, 2)).toBe(true);
  });

  it("rejects points inside a hole", () => {
    expect(contains(squareWithHole, 5, 5)).toBe(false);
  });

  it("rejects points outside the bounds", () => {
    expect(contains(squareWithHole, 11, 5)).toBe(false);
  });

  it("follows the real shape instead of the bounding box", () => {
    const pantanal = findRegion("pantanal")!;
    expect(contains(pantanal, -18.0, -57.0)).toBe(true);
    expect(contains(pantanal, -15.7, -54.8)).toBe(false);
  });
});

describe("region catalog", () => {
  it("keeps every shape inside its bounds", () => {
    for (const region of regions) {
      const [west, south, east, north] = region.bounds;
      const polygons =
        region.shape.type === "Polygon"
          ? [region.shape.coordinates]
          : region.shape.coordinates;
      for (const [longitude, latitude] of polygons.flat(2)) {
        expect(longitude).toBeGreaterThanOrEqual(west);
        expect(longitude).toBeLessThanOrEqual(east);
        expect(latitude).toBeGreaterThanOrEqual(south);
        expect(latitude).toBeLessThanOrEqual(north);
      }
    }
  });
});
