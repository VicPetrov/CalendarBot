import { Client, Events, GatewayIntentBits } from 'discord.js';
import * as path from "path";
import * as fs from "node:fs";
import ical, { ICalCalendarMethod, ICalCalendar, type ICalEventData } from 'ical-generator';


const ICAL_PATH = process.env?.ICAL_PATH ?? `${import.meta.dir}/ical/`;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;


async function write_calendar_file(filename: string, data: string) {
  filename = "treehouse.ics"
  fs.writeFile(path.join(ICAL_PATH, filename), data, _ => { });
  console.log(`Wrote ${filename} to disk.\nfile://${ICAL_PATH}`)
}

if (import.meta.main === true) {

  const bot_client = new Client({ intents: [GatewayIntentBits.GuildScheduledEvents, GatewayIntentBits.Guilds] });
  let guildICalDict: { [guildId: string]: ICalCalendar } = {};

  // Fetch and write scheduled events to coresponding files for all joined guilds on Bot Startup
  bot_client.once(Events.ClientReady, async (c) => {
    console.log(`Ready! ${c.user.tag} logged in!`);
    for (const guild of bot_client.guilds.cache.values()) {
      let ical_obj = ical({ name: `${guild.name} events` })
      ical_obj.prodId({ company: "Discord Inc", product: "Discord", language: "EN" });
      ical_obj.method(ICalCalendarMethod.PUBLISH)
      const events = await guild.scheduledEvents.fetch();
      for (const event of events.values()) {
        let end_time = event.scheduledStartAt;
        end_time?.setSeconds(end_time.getSeconds() + 1);
        let ed: ICalEventData = {
          id: event.id,
          summary: event.name,
          description: event.description,
          location: event.url,
          created: event.createdAt,
          start: event?.scheduledStartAt ?? event.createdAt,
          end: end_time,
        }
        ical_obj.createEvent(ed)
      }
      guildICalDict[guild.id] = ical_obj;
      await write_calendar_file(`${guild.name}_PUBLISH.ics`, ical_obj.toString())
    }
  })

  bot_client.on(Events.GuildScheduledEventCreate, async (se) => {
    guildICalDict[se.guildId].createEvent({
      id: se.id,
      summary: se.name,
      description: se.description,
      location: se.url,
      created: se.createdAt,
      start: se?.scheduledStartAt ?? se.createdAt,
      end: se?.scheduledEndAt ?? se.createdAt,
    })
    let guild_name = se.guild?.name ?? "";
    await write_calendar_file(`${guild_name}_PUBLISH.ics`, guildICalDict[se.guildId].toString())
  })

  bot_client.on(Events.GuildScheduledEventDelete, async (se) => {
    let events = guildICalDict[se.guildId].events()
    let new_events = [];
    for (let e of events) {
      if (e.id() != se.id) {
        new_events.push(e);
      } else {
        continue;
      }
    }
    guildICalDict[se.guildId].clear();
    guildICalDict[se.guildId].events(new_events);
    await write_calendar_file(`${se.guild?.name}_PUBLISH.ics`, guildICalDict[se.guildId].toString())
  })

  bot_client.on(Events.GuildScheduledEventUpdate, async (se_old, se) => {
    let events = guildICalDict[se.guildId].events()
    let new_events = [];
    for (let e of events) {

      if (String(e.id()) != se_old?.id ?? se.id) {
        new_events.push(e);
      } else {
        continue;
      }
    }
    guildICalDict[se.guildId].clear();
    guildICalDict[se.guildId].events(new_events);
    guildICalDict[se.guildId].createEvent({
      id: se.id,
      summary: se.name,
      description: se.description,
      location: se.url,
      created: se.createdAt,
      start: se?.scheduledStartAt ?? se.createdAt,
      end: se?.scheduledEndAt ?? se.createdAt,
    })

    await write_calendar_file(`${se.guild?.name}_PUBLISH.ics`, guildICalDict[se.guildId].toString())
  })

  bot_client.login(DISCORD_TOKEN);

} else {
  console.log(`Run with bun run ${import.meta.file} `)
}
