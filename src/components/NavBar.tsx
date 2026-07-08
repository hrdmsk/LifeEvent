import { Link, useNavigate } from "react-router-dom";
import { authClient } from "../authClient";

export function NavBar() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  async function logout() {
    await authClient.signOut();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          LifeEvent
        </Link>
        <div className="nav-links">
          <Link to="/">登録</Link>
          <Link to="/timeline">タイムライン</Link>
          {session ? (
            <>
              <Link to="/me">マイページ</Link>
              <button className="linklike" onClick={logout}>
                ログアウト
              </button>
            </>
          ) : (
            <Link to="/login">ログイン</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
