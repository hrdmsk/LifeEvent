import { useCallback, useEffect, useState } from "react";
import type { TimelineEntry } from "../types";
import { getTimeline } from "../api";
import { authClient } from "../authClient";
import { EventForm } from "./EventForm";
import { Timeline } from "./Timeline";

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
      <header className="header">
        <div>
          <h1>LifeEvent</h1>
          <p className="muted">{userName} さんの記録</p>
        </div>
        <button
          className="button button-ghost"
          onClick={() => authClient.signOut()}
        >
          ログアウト
        </button>
      </header>
      <EventForm onAdded={reload} />
      <Timeline entries={entries} />
    </div>
  );
}
