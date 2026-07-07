import { PublicAnniversaries } from "../components/PublicAnniversaries";

// 記念日の登録ページ（公開・認証不要）。
export function AnniversariesPage() {
  return (
    <div className="container">
      <PublicAnniversaries />
    </div>
  );
}
