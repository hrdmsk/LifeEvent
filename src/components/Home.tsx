import { useCallback, useEffect, useState } from "react";
import type { TimelineEntry, User } from "../types";
import { getTimeline, logout } from "../api";
import { EventForm } from "./EventForm";
import { Timeline } from "./Timeline";

export function Home({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  const reload = useCallback(() => {
    getTimeline()
      .then(setEntries)
      .catch(() => {});
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>LifeEvent</h1>
          <p className="muted">{user.displayName} さんの記録</p>
        </div>
        <button className="button button-ghost" onClick={handleLogout}>
          ログアウト
        </button>
      </header>
      <EventForm onAdded={reload} />
      <Timeline entries={entries} />
    </div>
  );
}
