import type { GuildScheduledEvent } from "discord.js";
import type { ICalEventData } from "ical-generator";
import { OFFSET_SECONDS } from "../constants";

export function convertEventData(event: GuildScheduledEvent): ICalEventData {
  let end_time = event.scheduledStartAt;
  end_time?.setSeconds(end_time.getSeconds() + OFFSET_SECONDS);
  return {
    id: event.id,
    summary: event.name,
    description: event.description,
    location: event.url,
    created: event.createdAt,
    start: event?.scheduledStartAt ?? event.createdAt,
    end: end_time,
  }
}
