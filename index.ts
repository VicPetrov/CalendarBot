import { bot_client } from "./src/settings/client";
import { EventHandler } from "./src/calendar/event_handler";
import { Events } from "discord.js";
import { DISCORD_TOKEN } from "./src/constants";

bot_client.once(Events.ClientReady, (client) => {
  EventHandler.createInstance(client).then(
    handlerInstance => {
      client.on(Events.GuildScheduledEventCreate, async (se) => { handlerInstance.on_create(se) });
      client.on(Events.GuildScheduledEventDelete, async (se) => { handlerInstance.on_delete(se) });
      client.on(Events.GuildScheduledEventUpdate, async (_, se) => { handlerInstance.on_update(se) });
      client.on(Events.GuildScheduledEventUserAdd, (...params) => { handlerInstance.on_sub(...params) });
      client.on(Events.GuildScheduledEventUserRemove, (...params) => { handlerInstance.on_unsub(...params) });
    }
  );
})

bot_client.login(DISCORD_TOKEN);
