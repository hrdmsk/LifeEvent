import { useEffect, useState } from "react";
import type { User } from "./types";
import { getMe } from "./api";
import { LoginScreen } from "./components/LoginScreen";
import { Home } from "./components/Home";

export function App() {
  // undefined = 読み込み中 / null = 未ログイン / User = ログイン済み
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return (
      <div className="container">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }
  if (user === null) {
    return <LoginScreen />;
  }
  return <Home user={user} onLogout={() => setUser(null)} />;
}
