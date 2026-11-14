import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseFirmsCsv } from "./parse-firms-csv.ts";

const modisCsv = readFileSync(
  new URL("./fixtures/modis-sample.csv", import.meta.url),
  "utf8",
);
const viirsCsv = readFileSync(
  new URL("./fixtures/viirs-sample.csv", import.meta.url),
  "utf8",
);

describe("parseFirmsCsv with MODIS", () => {
  const detections = parseFirmsCsv(modisCsv, "modis");

  it("reads every row", () => {
    expect(detections).toHaveLength(11);
  });

  it("tells Terra and Aqua apart from the satellite column", () => {
    expect(
      detections.filter((detection) => detection.sensor === "modis-terra"),
    ).toHaveLength(5);
    expect(
      detections.filter((detection) => detection.sensor === "modis-aqua"),
    ).toHaveLength(6);
  });

  it("converts the numeric confidence into classes", () => {
    const confidenceAt = (latitude: number) =>
      detections.find((detection) => detection.latitude === latitude)
        ?.confidence;
    expect(confidenceAt(-7.89012)).toBe("low");
    expect(confidenceAt(-6.58368)).toBe("nominal");
    expect(confidenceAt(-20.90373)).toBe("high");
  });

  it("builds the acquisition time in UTC and keeps the remaining fields", () => {
    expect(detections[3]).toEqual({
      sensor: "modis-terra",
      latitude: -20.90373,
      longitude: -58.26102,
      acquiredAt: "2026-11-13T12:53:00Z",
      confidence: "high",
      radiativePower: 174.58,
      daytime: true,
    });
  });
});

describe("parseFirmsCsv with VIIRS", () => {
  const detections = parseFirmsCsv(viirsCsv, "viirs");

  it("tells NOAA-20 and NOAA-21 apart from the satellite column", () => {
    expect(
      detections.filter((detection) => detection.sensor === "viirs-noaa20"),
    ).toHaveLength(5);
    expect(
      detections.filter((detection) => detection.sensor === "viirs-noaa21"),
    ).toHaveLength(5);
  });

  it("keeps the confidence class and the night flag", () => {
    expect(detections[1]).toMatchObject({
      sensor: "viirs-noaa20",
      acquiredAt: "2026-11-13T04:31:00Z",
      confidence: "high",
      daytime: false,
    });
    expect(detections[4].confidence).toBe("low");
  });
});

describe("parseFirmsCsv validation", () => {
  it("returns no detections for a file with only the header", () => {
    expect(parseFirmsCsv(viirsCsv.split("\n")[0], "viirs")).toEqual([]);
  });

  it("rejects a satellite that does not belong to the instrument", () => {
    expect(() => parseFirmsCsv(viirsCsv, "modis")).toThrow(
      /unknown modis satellite/,
    );
  });

  it("rejects a file without the expected columns", () => {
    expect(() => parseFirmsCsv("Invalid MAP_KEY.", "viirs")).toThrow(
      /missing the "latitude" column/,
    );
  });

  it("accepts the extra columns of the archive download", () => {
    const archiveCsv = [
      "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight,type",
      viirsCsv.split("\n")[1].replace(",N20,nominal,", ",N20,VIIRS,n,") + ",0",
    ].join("\n");
    expect(parseFirmsCsv(archiveCsv, "viirs")[0]).toMatchObject({
      sensor: "viirs-noaa20",
      confidence: "nominal",
    });
  });
});
