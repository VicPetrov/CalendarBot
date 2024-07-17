import type { Guild, GuildScheduledEvent } from "discord.js";
import { fetchEvents, type GuildICalDict } from "./init"
import { write_calendar_file } from "../write_file";
import { ICalEventStatus } from "ical-generator";

export async function on_update(se: GuildScheduledEvent, guildICalDict: GuildICalDict) {
  fetchEvents(se.guild, guildICalDict);
  for (let event of guildICalDict[se.guildId].events()) {
    if (event.id() == se.id) {
      event.status(ICalEventStatus.TENTATIVE);
      event.sequence(event.sequence() + 1)
    }
  }
  write_calendar_file(guildICalDict[se.guildId].toString(), se.guild?.name ?? "");
}
