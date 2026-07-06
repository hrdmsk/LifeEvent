import { authClient } from "./authClient";
import { LoginScreen } from "./components/LoginScreen";
import { Home } from "./components/Home";

export function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="container">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }
  if (!session) {
    return <LoginScreen />;
  }
  return <Home userName={session.user.name} />;
}
