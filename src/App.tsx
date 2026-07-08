import { Routes, Route, Navigate } from "react-router-dom";
import { authClient } from "./authClient";
import { NavBar } from "./components/NavBar";
import { AnniversariesPage } from "./pages/AnniversariesPage";
import { AnniversaryPage } from "./pages/AnniversaryPage";
import { TimelinePage } from "./pages/TimelinePage";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";

export function App() {
  const { isPending } = authClient.useSession();

  return (
    <>
      <NavBar />
      {isPending ? (
        <div className="container">
          <p className="muted">読み込み中…</p>
        </div>
      ) : (
        <Routes>
          {/* 記念日の登録ページ（公開・認証不要） */}
          <Route path="/" element={<AnniversariesPage />} />
          {/* みんなの記念日タイムライン（閲覧・公開） */}
          <Route path="/timeline" element={<TimelinePage />} />
          {/* 記念日の専用ページ（経過表示・公開） */}
          <Route path="/a/:uuid" element={<AnniversaryPage />} />
          {/* 認証ページ */}
          <Route path="/login" element={<LoginPage />} />
          {/* 個人タイムライン（要ログイン） */}
          <Route path="/me" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}
