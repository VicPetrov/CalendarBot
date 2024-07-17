import fs from "node:fs";
import path from "path";
import { ICAL_PATH, FILENAME } from "./constants";
import type { Path } from "typescript";

export async function write_calendar_file(data: string, folder: Path | string) {
  fs.writeFile(path.join(ICAL_PATH, folder, FILENAME), data, _ => { });
  console.log(`Wrote ${FILENAME} to disk.\nfile://${ICAL_PATH}`)
}

