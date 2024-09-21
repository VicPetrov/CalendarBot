import type { Attendee } from "./attendee";
import { bot_client } from "../bot_client";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Guild, PermissionFlagsBits, TextChannel } from "discord.js";

export class AlertEventData {
  id: string;
  guild: Guild;
  start: Date | null;
  leadTime: Date | null;
  attending: Array<Attendee> = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;


  constructor(id: string, guild: Guild, start: Date | null, leadTime: Date | null) {

    this.id = id;
    this.start = start;
    this.guild = guild;
    this.leadTime = leadTime;

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
              let event = guild.scheduledEvents.cache.get(this.id);
              for (let member of event!.channel!.members.values()) {
                this.attending.filter(alert_member => alert_member.id !== member.id);
              }
              let atty_string = this.attending.map(atty => `<@${atty.id}>`).join(" ");
              let msg = `${event?.url}\n${event?.name} scheduled to start <t:${Math.floor(start.getTime() / 1000)}:R>, ${atty_string} please join!\n`;
              let attendee_status_emebed = new EmbedBuilder()
                .setFields({ name: "waitlist", value: this.attending.map(atty => atty.tag).join("\n") || "None" });
              let components = [];
              let showButton = new ButtonBuilder()
                .setLabel("Will join")
                .setStyle(ButtonStyle.Success) // Set the style to link
                .setCustomId(`will_show${event?.id}`);
              components.push(showButton);

              let noshowButton = new ButtonBuilder()
                .setLabel("Can't join")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(`no_show${event?.id}`);
              components.push(noshowButton);

              if (event?.channel) {
                let joinChannelButton = new ButtonBuilder()
                  .setLabel("Event link")
                  .setStyle(ButtonStyle.Link)
                  .setURL(event.channel.url);
                components.push(joinChannelButton);
              }

              let row = new ActionRowBuilder<ButtonBuilder>().addComponents(components);

              channel.send({ content: msg, components: [row], embeds: [attendee_status_emebed] })
                .catch(error => {
                  console.error('Error sending message:', error);
                });

              break; // Break out of the loop on the first writable channel
            }
          }
        }
      }, leadTime!.getTime() - Date.now());
    }
  }
  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
