import { Link } from "react-router-dom";
import { AnniversaryForm } from "../components/AnniversaryForm";

// 記念日の登録ページ（公開・認証不要）。
export function AnniversariesPage() {
  return (
    <div className="container">
      <AnniversaryForm />
      <p className="muted">
        これまでの登録は <Link to="/timeline">タイムライン</Link> で見られます。
      </p>
    </div>
  );
}
