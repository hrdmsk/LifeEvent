import { Navigate } from "react-router-dom";
import { authClient } from "../authClient";

// 準備中（無効表示）のプロバイダ。将来 Better Auth に追加したら有効化する。
const COMING_SOON = ["Google", "LINE", "Discord"];

// 認証ページ。
export function LoginPage() {
  const { data: session } = authClient.useSession();

  // ログイン済みならマイページへ
  if (session) {
    return <Navigate to="/me" replace />;
  }

  async function signIn() {
    const { data, error } = await authClient.signIn.oauth2({
      providerId: "worldid",
      callbackURL: "/me",
    });
    if (error) {
      alert(`ログイン開始に失敗しました: ${error.message ?? error.statusText ?? ""}`);
      return;
    }
    if (data && "url" in data && typeof data.url === "string") {
      window.location.href = data.url;
    }
  }

  return (
    <div className="container">
      <div className="card login-card">
        <h1>ログイン</h1>
        <p className="muted lead">
          ログインすると、自分専用のタイムラインを記録できます。
        </p>

        <button className="button" onClick={signIn}>
          World ID でログイン
        </button>

        <div className="divider">他のログイン方法（準備中）</div>

        {COMING_SOON.map((name) => (
          <button key={name} className="button button-provider" disabled>
            {name} <span className="soon">準備中</span>
          </button>
        ))}

        <p className="fineprint">World ID はスマホの World App で認証します。</p>
      </div>
    </div>
  );
}
