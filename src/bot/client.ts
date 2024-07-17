import { Client, GatewayIntentBits } from "discord.js";

export const bot_client = new Client({ intents: [GatewayIntentBits.GuildScheduledEvents, GatewayIntentBits.Guilds] });
