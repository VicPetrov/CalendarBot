import type { GuildScheduledEvent } from "discord.js";
import type { ICalEventData } from "ical-generator";
import { ICAL_EVENT_DURATION } from "../defaults";

export function processEventData(event: GuildScheduledEvent): ICalEventData {
  let end_time = event.scheduledStartAt;
  end_time?.setSeconds(end_time.getSeconds() + ICAL_EVENT_DURATION);
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
