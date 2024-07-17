import { Events } from 'discord.js';
import { type GuildICalDict, initialise_events_dictionary } from './src/calendar/init';
import { bot_client } from './src/bot/client';
import { on_add as on_create } from './src/calendar/add';
import { on_delete } from './src/calendar/remove';
import { on_update } from './src/calendar/update';
import { DISCORD_TOKEN } from './src/constants';


// Fetch and write scheduled events to coresponding files for all joined guilds on Bot Startup
let guildIcalDict: GuildICalDict = {};
bot_client.once(Events.ClientReady, async (c) => {
  guildIcalDict = await initialise_events_dictionary(c);
})

bot_client.on(Events.GuildScheduledEventCreate, async (se) => { on_create(se, guildIcalDict) })

bot_client.on(Events.GuildScheduledEventDelete, async (se) => {
  on_delete(se, guildIcalDict)
})

bot_client.on(Events.GuildScheduledEventUpdate, async (_, se) => {
  on_update(se, guildIcalDict)
})

bot_client.login(DISCORD_TOKEN);
