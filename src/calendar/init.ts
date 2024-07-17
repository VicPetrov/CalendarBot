import { type Guild, type Client, type GuildInvitableChannelResolvable } from "discord.js";
import ical, { ICalCalendarMethod, ICalCalendar } from "ical-generator";
import { convertEventData } from "./convert";

export interface GuildICalDict {
  [guildId: string]: ICalCalendar;
};

export async function initialise_events_dictionary(client: Client): Promise<GuildICalDict> {
  const guildICalDict: GuildICalDict = {};

  for (const guild of client.guilds.cache.values()) {
    let ical_obj = ical({ name: `${guild.name} events` });
    ical_obj.prodId({ company: "Discord Inc", product: "Discord", language: "EN" });
    ical_obj.method(ICalCalendarMethod.PUBLISH);
    fetchEvents(guild, guildICalDict);
  }
  return guildICalDict;
}

export async function fetchEvents(guild: Guild | null, guildICalDict: GuildICalDict) {
  if (guild) {
    let events = await guild.scheduledEvents.fetch();
    for (let event of events.values()) {
      guildICalDict[guild.id].createEvent(convertEventData(event));
    }
  }
}
