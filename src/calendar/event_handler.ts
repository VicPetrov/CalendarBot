import { type Guild as DiscordGuild, type Client as DiscordClient } from "discord.js";
import type { GuildScheduledEvent, PartialGuildScheduledEvent } from "discord.js";

import ical, { ICalCalendarMethod } from "ical-generator";
import { ICalEventStatus } from "ical-generator";

import { type GuildICalDict } from "./types";
import { write_calendar_file } from "../write_file";
import { convertEventData } from "./convert";

export class EventHandler {

  dict: GuildICalDict = {};
  client: DiscordClient;


  private constructor(client: DiscordClient) {
    this.client = client;
  }

  static async createInstance(client: DiscordClient) {
    let instance = new EventHandler(client);
    await instance.initialize();
    return instance;
  }

  private async initialize() {
    for (let guild of this.client.guilds.cache.values()) {
      let ical_obj = ical({ name: `${guild.name} events` });
      ical_obj.prodId({ company: "Discord Inc", product: "Discord", language: "EN" });
      ical_obj.method(ICalCalendarMethod.PUBLISH);
      this.dict[guild.id] = ical_obj;
      await this.fetch_events(guild);
      write_calendar_file(this.dict[guild.id].toString(), guild.name);
    }

  }

  async on_create(se: GuildScheduledEvent) {
    await this.fetch_events(se.guild);
    write_calendar_file(this.dict[se.guildId].toString(), se.guild?.name ?? "");
  }

  async on_update(se: GuildScheduledEvent) {
    await this.fetch_events(se.guild);
    let events = this.dict[se.guildId].events();
    for (let i = 0; i < events.length; i++) {
      if (events[i].id() == se.id) {
        events[i].status(ICalEventStatus.TENTATIVE);
        events[i].sequence(events[i].sequence() + 1);
      }
    }
    this.dict[se.guildId].clear();
    this.dict[se.guildId].events(events);
    write_calendar_file(this.dict[se.guildId].toString(), se.guild?.name ?? "");
  }


  async on_delete(se: GuildScheduledEvent | PartialGuildScheduledEvent) {
    let events = this.dict[se.guildId].events();
    for (let i = 0; i < events.length; i++) {
      if (events[i].id() == se.id) {
        events[i].status(ICalEventStatus.CANCELLED);
        events[i].sequence(events[i].sequence() + 1);
      }
    }
    this.dict[se.guildId].clear();
    this.dict[se.guildId].events(events);
    write_calendar_file(this.dict[se.guildId].toString(), se.guild?.name ?? "");
  }

  async fetch_events(guild: DiscordGuild | null) {
    if (guild) {
      this.dict[guild.id].clear();
      let events = await guild.scheduledEvents.fetch();
      for (let event of events.values()) {
        this.dict[guild.id].createEvent(convertEventData(event));
      }
    }
  }
}
