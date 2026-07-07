import { Navigate } from "react-router-dom";
import { authClient } from "../authClient";
import { Home } from "../components/Home";

// 個人タイムライン（要ログイン）。未ログインは認証ページへ。
export function HomePage() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="container">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Home userName={session.user.name} />;
}
