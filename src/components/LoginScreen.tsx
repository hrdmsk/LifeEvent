import { loginUrl } from "../api";

export function LoginScreen() {
  return (
    <div className="container login">
      <div className="card login-card">
        <h1>LifeEvent</h1>
        <p className="muted lead">人生の出来事を記録して、時系列で振り返る。</p>
        <a className="button button-google" href={loginUrl}>
          <span className="g-mark">G</span>
          Googleでログイン
        </a>
        <p className="fineprint">
          ログインすると利用を開始できます。
        </p>
      </div>
    </div>
  );
}
