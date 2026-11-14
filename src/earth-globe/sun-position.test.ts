import { describe, expect, it } from "vitest";
import { subsolarPoint } from "./sun-position";

describe("subsolarPoint", () => {
  it("puts the sun over the equator at the March 2026 equinox", () => {
    expect(
      subsolarPoint(new Date("2026-03-20T14:46:00Z")).latitude,
    ).toBeCloseTo(0, 1);
  });

  it("puts the sun over the tropics at the 2026 solstices", () => {
    expect(
      subsolarPoint(new Date("2026-06-21T08:24:00Z")).latitude,
    ).toBeCloseTo(23.44, 1);
    expect(
      subsolarPoint(new Date("2026-12-21T20:50:00Z")).latitude,
    ).toBeCloseTo(-23.44, 1);
  });

  it("shifts the noon sun by the equation of time", () => {
    expect(
      subsolarPoint(new Date("2026-11-03T12:00:00Z")).longitude,
    ).toBeCloseTo(-4.1, 1);
    expect(
      subsolarPoint(new Date("2026-02-11T12:00:00Z")).longitude,
    ).toBeCloseTo(3.55, 1);
  });

  it("moves the sun west as the day goes on", () => {
    const morning = subsolarPoint(new Date("2026-11-14T09:00:00Z"));
    const evening = subsolarPoint(new Date("2026-11-14T21:00:00Z"));
    expect(morning.longitude).toBeGreaterThan(0);
    expect(evening.longitude).toBeLessThan(0);
  });
});
