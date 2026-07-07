import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { TimelineEntry } from "../types";
import { addPublicAnniversary, getPublicAnniversaries } from "../api";

// 認証なしで誰でも登録・閲覧できる「みんなの記念日」。
export function PublicAnniversaries() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    getPublicAnniversaries()
      .then(setEntries)
      .catch(() => {});
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!date || !title) return;
    setBusy(true);
    try {
      await addPublicAnniversary({ title, memo, date });
      setTitle("");
      setMemo("");
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>みんなの記念日</h2>
      <p className="muted">
        ログインなしで登録・閲覧できます。ひとつずつ大事に登録できるよう、登録は1時間に1件までです。
      </p>

      <form onSubmit={submit}>
        <div className="row">
          <div>
            <label htmlFor="pub-date">日付</label>
            <input
              id="pub-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="pub-title">記念日の名前</label>
            <input
              id="pub-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 猫の日"
            />
          </div>
        </div>
        <label htmlFor="pub-memo">ひとこと（任意）</label>
        <input
          id="pub-memo"
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <button className="button" type="submit" disabled={busy}>
          {busy ? "登録中…" : "記念日を登録"}
        </button>
      </form>

      <div className="anniversary-list">
        {entries.length === 0 ? (
          <p className="muted">まだ記念日がありません。</p>
        ) : (
          entries.map((it) => (
            <div className="timeline-item" key={it.event.id}>
              <time>{it.event.date}</time>
              <h3>{it.event.title}</h3>
              {it.event.memo && <p className="muted">{it.event.memo}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
