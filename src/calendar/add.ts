import type { GuildScheduledEvent } from "discord.js";
import { fetchEvents, type GuildICalDict } from "./init"
import { write_calendar_file } from "../write_file";

export async function on_add(se: GuildScheduledEvent, guildICalDict: GuildICalDict) {
  fetchEvents(se.guild, guildICalDict);
  write_calendar_file(guildICalDict[se.guildId].toString(), se.guild?.name ?? "");
}
