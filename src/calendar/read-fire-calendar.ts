import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FireCalendar } from "@/harmonization/fire-calendar";

const CALENDAR_DIRECTORY = join(process.cwd(), "data", "calendars");

export async function readFireCalendar(
  regionId: string,
): Promise<FireCalendar | null> {
  const path = join(CALENDAR_DIRECTORY, `${regionId}.json`);
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(await readFile(path, "utf8")) as FireCalendar;
}
