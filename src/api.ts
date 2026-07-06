import type { LifeEvent, TimelineEntry, User } from "./types";

// Googleログイン開始URL（Workerが認可画面へリダイレクトする）
export const loginUrl = "/api/auth/google/login";

// 現在のログインユーザー。未ログインなら null。
export async function getMe(): Promise<User | null> {
  const res = await fetch("/api/me");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("failed to load user");
  return (await res.json()) as User;
}

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

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
