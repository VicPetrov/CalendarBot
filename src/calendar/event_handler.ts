import { type Guild as DiscordGuild, type Client as DiscordClient } from "discord.js";
import type { GuildScheduledEvent, PartialGuildScheduledEvent, User } from "discord.js";

import ical, { ICalCalendarMethod } from "ical-generator";
import { ICalEventStatus } from "ical-generator";

import { type GuildICalDict } from "./types";
import { write_calendar_file } from "../write_file";
import { processEventData } from "./convert_event_data";
import { AlertEventData } from "./event";
import { Attendee } from "./attendee";

export class EventHandler {

  dict: GuildICalDict = {};
  client: DiscordClient;
  alerts: Array<AlertEventData> = [];

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

    for (let alert of this.alerts) {
      if (alert.id == se.id) {
        alert.cancel();
      }
    }

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

  async on_sub(guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent, user: User) {
    let event = this.alerts.find(al => al.id === guildScheduledEvent.id);
    event?.attending.push(new Attendee(user.id, user.tag));
  }
  async on_unsub(guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent, unsubbed_user: User) {
    let event = this.alerts.find(al => al.id === guildScheduledEvent.id);
    if (event) {
      event.attending = event.attending.filter(stored_user => stored_user.id !== unsubbed_user.id);
    }
  }

  async fetch_events(guild: DiscordGuild | null) {
    if (guild) {
      this.dict[guild.id].clear();
      this.alerts = [];
      let events = await guild.scheduledEvents.fetch();
      for (let event of events.values()) {
        this.alerts.push(new AlertEventData(event.id, guild, event.scheduledStartAt));
        this.dict[guild.id].createEvent(processEventData(event));
      }
    }
  }
}
