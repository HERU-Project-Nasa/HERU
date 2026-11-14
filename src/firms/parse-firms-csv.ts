import type { Detection } from "./detection.ts";
import type { Instrument, Sensor } from "./sensor.ts";

const REQUIRED_COLUMNS = [
  "latitude",
  "longitude",
  "acq_date",
  "acq_time",
  "satellite",
  "confidence",
  "frp",
  "daynight",
] as const;

type Column = (typeof REQUIRED_COLUMNS)[number];

const SENSORS_BY_SATELLITE: Record<Instrument, Record<string, Sensor>> = {
  modis: {
    T: "modis-terra",
    Terra: "modis-terra",
    A: "modis-aqua",
    Aqua: "modis-aqua",
  },
  viirs: {
    N: "viirs-snpp",
    N20: "viirs-noaa20",
    N21: "viirs-noaa21",
  },
};

const VIIRS_CONFIDENCE: Record<string, Detection["confidence"]> = {
  l: "low",
  low: "low",
  n: "nominal",
  nominal: "nominal",
  h: "high",
  high: "high",
};

const MODIS_NOMINAL_CONFIDENCE = 30;
const MODIS_HIGH_CONFIDENCE = 80;

export function parseFirmsCsv(
  csv: string,
  instrument: Instrument,
): Detection[] {
  const [headerLine, ...rows] = csv.split(/\r?\n/);
  const columns = locateColumns(headerLine.split(","));
  return rows
    .filter((row) => row !== "")
    .map((row) => parseRow(row, columns, instrument));
}

function locateColumns(header: string[]): Record<Column, number> {
  const columns = {} as Record<Column, number>;
  for (const column of REQUIRED_COLUMNS) {
    const position = header.indexOf(column);
    if (position === -1) {
      throw new Error(`FIRMS CSV is missing the "${column}" column`);
    }
    columns[column] = position;
  }
  return columns;
}

function parseRow(
  row: string,
  columns: Record<Column, number>,
  instrument: Instrument,
): Detection {
  const fields = row.split(",");
  const field = (column: Column) => fields[columns[column]] ?? "";
  const reject = (reason: string): never => {
    throw new Error(`Cannot read FIRMS row "${row}": ${reason}`);
  };

  const latitude = readNumber(field("latitude")) ?? reject("invalid latitude");
  const longitude =
    readNumber(field("longitude")) ?? reject("invalid longitude");
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    reject("coordinates out of range");
  }

  const sensor =
    SENSORS_BY_SATELLITE[instrument][field("satellite")] ??
    reject(`unknown ${instrument} satellite`);
  const confidence =
    readConfidence(field("confidence"), instrument) ??
    reject("invalid confidence");
  const acquiredAt =
    readAcquisitionTime(field("acq_date"), field("acq_time")) ??
    reject("invalid acquisition time");
  const radiativePower =
    readNumber(field("frp")) ?? reject("invalid fire radiative power");

  const dayNight = field("daynight");
  if (dayNight !== "D" && dayNight !== "N") {
    reject("invalid day or night flag");
  }

  return {
    sensor,
    latitude,
    longitude,
    acquiredAt,
    confidence,
    radiativePower,
    daytime: dayNight === "D",
  };
}

function readNumber(text: string): number | undefined {
  const number = Number(text);
  return text === "" || !Number.isFinite(number) ? undefined : number;
}

function readConfidence(
  confidence: string,
  instrument: Instrument,
): Detection["confidence"] | undefined {
  if (instrument === "viirs") {
    return VIIRS_CONFIDENCE[confidence];
  }
  const percent = readNumber(confidence);
  if (
    percent === undefined ||
    !Number.isInteger(percent) ||
    percent < 0 ||
    percent > 100
  ) {
    return undefined;
  }
  if (percent >= MODIS_HIGH_CONFIDENCE) {
    return "high";
  }
  return percent >= MODIS_NOMINAL_CONFIDENCE ? "nominal" : "low";
}

function readAcquisitionTime(date: string, time: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,4}$/.test(time)) {
    return undefined;
  }
  const hoursAndMinutes = time.padStart(4, "0");
  const acquiredAt = `${date}T${hoursAndMinutes.slice(0, 2)}:${hoursAndMinutes.slice(2)}:00Z`;
  return Number.isNaN(Date.parse(acquiredAt)) ? undefined : acquiredAt;
}
