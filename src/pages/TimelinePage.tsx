import { PublicTimeline } from "../components/PublicTimeline";

// みんなの記念日タイムライン（閲覧ページ・公開）。
export function TimelinePage() {
  return (
    <div className="container">
      <PublicTimeline />
    </div>
  );
}
