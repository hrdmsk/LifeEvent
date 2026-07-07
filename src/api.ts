import type { LifeEvent, SavedToken, StyleConfig, TimelineEntry } from "./types";

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

// --- みんなの記念日（認証なし・公開） ---

export async function getPublicAnniversaries(): Promise<TimelineEntry[]> {
  const res = await fetch("/api/public/anniversaries");
  if (!res.ok) throw new Error("failed to load anniversaries");
  return (await res.json()) as TimelineEntry[];
}

export async function getAnniversary(uuid: string): Promise<LifeEvent> {
  const res = await fetch(`/api/public/anniversaries/${uuid}`);
  if (!res.ok) throw new Error("not found");
  return (await res.json()) as LifeEvent;
}

export async function updateAnniversaryStyle(
  uuid: string,
  style: StyleConfig,
): Promise<void> {
  const res = await fetch(`/api/me/anniversaries/${uuid}/style`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(style),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "保存に失敗しました");
  }
}

export async function addPublicAnniversary(input: {
  title: string;
  memo: string;
  date: string;
}): Promise<void> {
  const res = await fetch("/api/public/anniversaries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "登録に失敗しました");
  }
}

// --- アカウントが保持する Token ID（UUID）のコレクション ---

export async function getMyTokens(): Promise<SavedToken[]> {
  const res = await fetch("/api/me/tokens");
  if (!res.ok) throw new Error("failed to load tokens");
  return (await res.json()) as SavedToken[];
}

export async function saveToken(uuid: string): Promise<void> {
  const res = await fetch("/api/me/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuid }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "保存に失敗しました");
  }
}

export async function removeToken(uuid: string): Promise<void> {
  const res = await fetch(`/api/me/tokens/${uuid}`, { method: "DELETE" });
  if (!res.ok) throw new Error("failed to remove token");
}
