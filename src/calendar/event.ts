import type { Attendee } from "./attendee";
import { bot_client } from "../settings/client";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Guild, PermissionFlagsBits, TextChannel } from "discord.js";

export class AlertEventData {
  id: string;
  guild: Guild;
  start: Date | null;
  attending: Array<Attendee> = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;



  constructor(id: string, guild: Guild, start: Date | null) {
    this.id = id;
    this.start = start;
    this.guild = guild;
    if (start && start!.getTime() > Date.now()) {
      this.timeoutId = setTimeout(() => {
        const botMember = guild.members.cache.get(bot_client.user!.id);
        // Iterate over all channels in the guild
        for (const channel of guild.channels.cache.values()) {
          // Check if the channel is a text-based channel
          if (channel instanceof TextChannel && botMember) {
            // Fetch the bot's permissions in the channel
            const permissions = channel.permissionsFor(botMember);

            // Check if the bot has permission to send messages
            if (permissions && permissions.has(PermissionFlagsBits.SendMessages)) {
              const event = guild.scheduledEvents.cache.get(this.id);
              let atty_string = this.attending.map(atty => `<@${atty.id}>`).join(" ");
              let msg = `${event?.name} is scheduled to happen <t:${Math.floor(start.getTime() / 1000)}:R>, ${atty_string} please join!\n`;
              const joinButton = new ButtonBuilder()
                .setLabel('Join Event')
                .setStyle(ButtonStyle.Link) // Set the style to link
                .setURL(event!.url); // URL of the event

              const row = new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton);
              let embed = new EmbedBuilder().setURL(event!.url).setThumbnail(event!.coverImageURL());
              channel.send({ content: msg, embeds: [embed], components: [row] }).then(sentMessage => {
                // Log the sent message details to the console
                console.log(`Sent message: ${sentMessage.content} `);
                console.log(`Message ID: ${sentMessage.id} `);
                console.log(`Channel ID: ${sentMessage.channel.id} `);
                console.log(`Attendees: ${this.attending}`);
              })
                .catch(error => {
                  console.error('Error sending message:', error);
                });

              break; // Break out of the loop on the first matching channel
            }
          }
        }
      }, start!.getTime() - Date.now());
    }
  }
  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
