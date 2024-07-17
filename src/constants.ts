export const ICAL_PATH = process.env?.ICAL_PATH ?? `${import.meta.dir}/ical/`;
export const DISCORD_TOKEN = process.env?.DISCORD_TOKEN;
export const OFFSET_SECONDS = parseInt(process.env?.OFFSET_SECONDS || "1800");
export const FILENAME = process.env?.CB_FILENAME ?? "treehouse.ics";
