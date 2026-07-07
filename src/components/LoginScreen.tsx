import { authClient } from "../authClient";

// 準備中（無効表示）のプロバイダ。将来 Better Auth に追加したら有効化する。
const COMING_SOON = ["Google", "LINE", "Discord"];

export function LoginScreen() {
  async function signIn() {
    const { data, error } = await authClient.signIn.oauth2({
      providerId: "worldid",
      callbackURL: "/",
    });
    if (error) {
      alert(`ログイン開始に失敗しました: ${error.message ?? error.statusText ?? ""}`);
      return;
    }
    // 自動リダイレクトされない場合に備え、返ってきたURLへ明示的に遷移する
    if (data && "url" in data && typeof data.url === "string") {
      window.location.href = data.url;
    }
  }

  return (
    <div className="container login">
      <div className="card login-card">
        <h1>LifeEvent</h1>
        <p className="muted lead">人生の出来事を記録して、時系列で振り返る。</p>

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
