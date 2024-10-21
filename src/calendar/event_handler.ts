import { type Guild as DiscordGuild, type Client as DiscordClient, EmbedBuilder, REST, Routes, ApplicationCommandOptionType } from "discord.js";
import type { ButtonInteraction, CommandInteraction, GuildScheduledEvent, PartialGuildScheduledEvent, User } from "discord.js";

import ical, { ICalCalendarMethod } from "ical-generator";
import { ICalEventStatus } from "ical-generator";

import { type GuildICalDict } from "../types";
import { write_calendar_file } from "../write_file";
import { processEventData } from "./convert_event_data";
import { AlertEventData } from "./event";
import { Attendee } from "./attendee";
import { ALERT_LEAD_TIME, DISCORD_TOKEN } from "../defaults";
import { bot_client } from "../bot_client";

export class EventHandler {
  alert_offset: number = ALERT_LEAD_TIME;
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

    const commands = [
      {
        name: 'alert',
        description: 'Override alert time for events after command',
        options: [
          {
            name: 'minutes',
            type: ApplicationCommandOptionType.Integer, // Expecting a number (integer)
            description: 'The number of minutes before the event, if empty replies with current setting',
            required: false, // Make it a required parameter
          },
        ],
      },
    ];
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN || "");

    for (let guild of this.client.guilds.cache.values()) {


      (async () => {
        try {
          console.log('Started refreshing application (/) commands.');

          await rest.put(Routes.applicationGuildCommands(bot_client.user!.id, guild.id), {
            body: commands,
          });

          console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
          console.error(error);
        }
      })();

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
  async slash_commands(interaction: CommandInteraction) {
    const { commandName } = interaction;
    if (commandName === "alert") {
      const minutes = interaction.options.get('minutes');
      if (minutes) {
        this.alert_offset = parseInt(minutes?.value?.toString() || "5");
        this.fetch_events(interaction.guild);
      }
      await interaction.reply(`alert lead time is set to: ${this.alert_offset}`)
    }
  }
  async event_actionrow(interaction: ButtonInteraction) {
    if (interaction.customId.startsWith("no_show")) {
      let event = this.alerts.find(al => al.id === interaction.customId.slice("no_show".length));
      let discord_ev = interaction.guild?.scheduledEvents.cache.find(ev => ev.id == event?.id);
      if (interaction.user.id == discord_ev?.creator?.id) {
        discord_ev.delete();
        interaction.message.edit({ content: "Event cancelled. 💀", embeds: [], components: [] })
        interaction.deferUpdate();
        return;
      }
      if (event) {
        event.attending = event.attending.filter(stored_user => stored_user.id !== interaction.user.id);

        const oldEmbed = interaction.message.embeds[0];
        const updatedEmbed = new EmbedBuilder(oldEmbed.data)
          .setFields(
            oldEmbed.fields.map(field => {
              if (field.name === 'waitlist') {
                return { name: 'waitlist', value: event.attending.map(atty => atty.tag).join("\n") || "None", inline: true };
              }
              return field;
            })
          );

        // Edit the message with the updated embed
        await interaction.message.edit({ embeds: [updatedEmbed] });
      }
    } else if (interaction.customId.startsWith("will_show")) {
      let event = this.alerts.find(al => al.id === interaction.customId.slice("will_show".length))
      if (event) {
        event.attending = event.attending.filter(stored_user => stored_user.id !== interaction.user.id)
      }
    }
    interaction.deferUpdate();
  }

  async fetch_events(guild: DiscordGuild | null) {
    if (guild) {
      this.dict[guild.id].clear();
      this.alerts.forEach(al => al.cancel());
      this.alerts = [];
      let events = await guild.scheduledEvents.fetch();
      for (let event of events.values()) {
        let st = event.scheduledStartAt;
        this.alerts.push(new AlertEventData(event.id, guild, st, new Date(st!.setMinutes(st!.getMinutes() - this.alert_offset))));
        this.dict[guild.id].createEvent(processEventData(event));
      }
    }
  }
}
