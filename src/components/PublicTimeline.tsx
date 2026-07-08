import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { TimelineEntry } from "../types";
import { getPublicAnniversaries, saveToken } from "../api";
import { authClient } from "../authClient";

// みんなの記念日のタイムライン（閲覧専用ページ用）。
export function PublicTimeline() {
  const { data: session } = authClient.useSession();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  const reload = useCallback(() => {
    getPublicAnniversaries()
      .then(setEntries)
      .catch(() => {});
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function save(uuid: string) {
    try {
      await saveToken(uuid);
      alert("アカウントに保存しました（マイページで確認できます）");
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存に失敗しました");
    }
  }

  return (
    <div className="card">
      <h2>みんなの記念日タイムライン</h2>
      <p className="muted">これまでに登録された記念日の一覧です。</p>
      <div className="anniversary-list">
        {entries.length === 0 ? (
          <p className="muted">まだ記念日がありません。</p>
        ) : (
          entries.map((it) => (
            <div className="timeline-item" key={it.event.id}>
              <time>
                {it.event.date}
                {it.event.time && ` ${it.event.time}`}
              </time>
              <h3>
                {it.event.uuid ? (
                  <Link to={`/a/${it.event.uuid}`}>{it.event.title}</Link>
                ) : (
                  it.event.title
                )}
              </h3>
              {it.event.memo && <p className="muted">{it.event.memo}</p>}
              {it.event.uuid && (
                <div className="token-row">
                  <Link className="detail-link" to={`/a/${it.event.uuid}`}>
                    経過を見る →
                  </Link>
                  {session && (
                    <button
                      className="linklike"
                      onClick={() => save(it.event.uuid)}
                    >
                      アカウントに保存
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
