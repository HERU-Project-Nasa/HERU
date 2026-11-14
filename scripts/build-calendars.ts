import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { Detection } from "../src/firms/detection.ts";
import { parseFirmsCsv } from "../src/firms/parse-firms-csv.ts";
import type { Instrument } from "../src/firms/sensor.ts";
import type {
  FireCalendar,
  HarmonizedRegion,
} from "../src/harmonization/fire-calendar.ts";
import { gridActivity } from "../src/harmonization/grid-activity.ts";
import { harmonizeRegion } from "../src/harmonization/harmonize-region.ts";
import { regions } from "../src/regions/region-catalog.ts";

const RAW_DIRECTORY = "data/raw";
const CALENDAR_DIRECTORY = "data/calendars";
const CELLS_DIRECTORY = "public/cells";
const INSTRUMENTS: Instrument[] = ["modis", "viirs"];
const CHUNK_BYTES = 16 * 1024 * 1024;

const requestedRegionIds = process.argv.slice(2);
for (const regionId of requestedRegionIds) {
  if (!regions.some((region) => region.id === regionId)) {
    throw new Error(`Unknown region "${regionId}"`);
  }
}
const selectedRegions =
  requestedRegionIds.length === 0
    ? regions
    : regions.filter((region) => requestedRegionIds.includes(region.id));

const activity = gridActivity(readDetections(firmsFiles()));
report(`static cells in the downloaded area: ${activity.staticCells.length}`);

for (const region of selectedRegions) {
  let harmonized: HarmonizedRegion;
  try {
    harmonized = harmonizeRegion(activity, region);
  } catch (error) {
    report(`${region.id}: skipped, ${(error as Error).message}`);
    process.exitCode = 1;
    continue;
  }
  writeHarmonizedRegion(harmonized);
  report(describeCalendar(harmonized.calendar));
}

function firmsFiles(): { path: string; instrument: Instrument }[] {
  const files = INSTRUMENTS.flatMap((instrument) => {
    const directory = join(RAW_DIRECTORY, instrument);
    if (!existsSync(directory)) {
      return [];
    }
    return readdirSync(directory)
      .filter((fileName) => fileName.endsWith(".csv"))
      .sort()
      .map((fileName) => ({ path: join(directory, fileName), instrument }));
  });
  if (files.length === 0) {
    throw new Error(
      `No FIRMS CSV files in ${join(RAW_DIRECTORY, "modis")} or ${join(RAW_DIRECTORY, "viirs")}`,
    );
  }
  return files;
}

function* readDetections(
  files: { path: string; instrument: Instrument }[],
): Generator<Detection> {
  for (const file of files) {
    report(`reading ${file.path}`);
    yield* readFirmsFile(file.path, file.instrument);
  }
}

function writeHarmonizedRegion({ calendar, observedYears }: HarmonizedRegion) {
  mkdirSync(CALENDAR_DIRECTORY, { recursive: true });
  writeFileSync(
    join(CALENDAR_DIRECTORY, `${calendar.regionId}.json`),
    `${JSON.stringify(calendar)}
`,
  );
  const cellsDirectory = join(CELLS_DIRECTORY, calendar.regionId);
  rmSync(cellsDirectory, { recursive: true, force: true });
  mkdirSync(cellsDirectory, { recursive: true });
  for (const observedYear of observedYears) {
    writeFileSync(
      join(cellsDirectory, `${observedYear.year}.json`),
      `${JSON.stringify(observedYear)}
`,
    );
  }
}

function* readFirmsFile(
  path: string,
  instrument: Instrument,
): Generator<Detection> {
  const file = openSync(path, "r");
  const decoder = new TextDecoder();
  const chunk = Buffer.alloc(CHUNK_BYTES);
  let header: string | undefined;
  let unfinishedLine = "";
  let bytesRead = readSync(file, chunk);

  while (bytesRead > 0) {
    const text =
      unfinishedLine +
      decoder.decode(chunk.subarray(0, bytesRead), { stream: true });
    const lastLineBreak = text.lastIndexOf("\n");
    unfinishedLine = text.slice(lastLineBreak + 1);
    let completeLines = text.slice(0, lastLineBreak + 1);
    if (header === undefined && completeLines !== "") {
      header = completeLines.slice(0, completeLines.indexOf("\n"));
      completeLines = completeLines.slice(header.length + 1);
    }
    if (completeLines !== "") {
      yield* parseFirmsCsv(`${header}\n${completeLines}`, instrument);
    }
    bytesRead = readSync(file, chunk);
  }
  closeSync(file);

  const lastLine = unfinishedLine + decoder.decode();
  if (header !== undefined && lastLine.trim() !== "") {
    yield* parseFirmsCsv(`${header}\n${lastLine}`, instrument);
  }
}

function describeCalendar(calendar: FireCalendar): string {
  const anomalies = calendar.weeks.filter((week) => week.anomaly).length;
  const lines = [
    `${calendar.regionId}: ${calendar.firstYear} to ${calendar.lastYear}, ${calendar.weeks.length} weeks, ${anomalies} anomalies`,
    `  fire season weeks: ${calendar.fireSeason.join(" ")}`,
    `  static cells: ${calendar.staticCells.length}`,
  ];
  for (const source of new Set(
    calendar.calibrations.map((calibration) => calibration.source),
  )) {
    for (const daytime of [true, false]) {
      const factors = calendar.calibrations
        .filter(
          (calibration) =>
            calibration.source === source && calibration.daytime === daytime,
        )
        .map((calibration) => calibration.factor.toFixed(2));
      lines.push(
        `  ${source} ${daytime ? "day" : "night"} factors by month: ${factors.join(" ")}`,
      );
    }
  }
  return lines.join("\n");
}

function report(message: string) {
  process.stdout.write(`${message}\n`);
}
