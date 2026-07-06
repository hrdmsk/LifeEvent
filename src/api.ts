import type { LifeEvent, TimelineEntry } from "./types";

export async function getTimeline(): Promise<TimelineEntry[]> {
  const res = await fetch("/api/me/timeline");
  if (!res.ok) throw new Error("failed to load timeline");
  return (await res.json()) as TimelineEntry[];
}

export async function addEvent(input: {
  event_type: string;
  title: string;
  memo: string;
  date: string;
}): Promise<LifeEvent> {
  const res = await fetch("/api/me/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("failed to add event");
  return (await res.json()) as LifeEvent;
}
