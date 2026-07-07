import { useCallback, useEffect, useState } from "react";
import type { TimelineEntry } from "../types";
import { getTimeline } from "../api";
import { EventForm } from "./EventForm";
import { Timeline } from "./Timeline";
import { SavedTokens } from "./SavedTokens";

// 個人タイムラインの中身（ログアウトは NavBar が担当）。
export function Home({ userName }: { userName: string }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  const reload = useCallback(() => {
    getTimeline()
      .then(setEntries)
      .catch(() => {});
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="container">
      <header className="page-head">
        <h1>マイページ</h1>
        <p className="muted">{userName} さんの記録</p>
      </header>
      <EventForm onAdded={reload} />
      <Timeline entries={entries} />
      <SavedTokens />
    </div>
  );
}
