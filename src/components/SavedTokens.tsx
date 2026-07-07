import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SavedToken } from "../types";
import { getMyTokens, removeToken } from "../api";

// アカウントが保持する Token ID（UUID）の一覧。
export function SavedTokens() {
  const [tokens, setTokens] = useState<SavedToken[]>([]);

  const reload = useCallback(() => {
    getMyTokens()
      .then(setTokens)
      .catch(() => {});
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function remove(uuid: string) {
    try {
      await removeToken(uuid);
      reload();
    } catch {
      alert("解除に失敗しました");
    }
  }

  return (
    <section className="card">
      <h2>保存した記念日（Token ID）</h2>
      <p className="muted">
        将来 SBT に移行した際の Token ID の代替として、各記念日に UUID を付与しています。
      </p>
      {tokens.length === 0 ? (
        <p className="muted">まだ保存した記念日がありません。</p>
      ) : (
        tokens.map((t) => (
          <div className="timeline-item" key={t.uuid}>
            <time>{t.date}</time>
            <h3>
              <Link to={`/a/${t.uuid}`}>{t.title}</Link>
            </h3>
            {t.memo && <p className="muted">{t.memo}</p>}
            <div className="token-row">
              <Link className="detail-link" to={`/a/${t.uuid}`}>
                経過を見る →
              </Link>
              <button className="linklike" onClick={() => remove(t.uuid)}>
                保存を解除
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
