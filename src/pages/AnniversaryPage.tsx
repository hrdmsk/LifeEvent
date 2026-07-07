import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import type { FontKey, LifeEvent, StyleConfig } from "../types";
import { getAnniversary, updateAnniversaryStyle } from "../api";
import { authClient } from "../authClient";

// フォントキー → font-family（日本語も考慮）
const FONT_FAMILY: Record<FontKey, string> = {
  sans: 'system-ui, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif',
  serif: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif',
  rounded:
    '"Hiragino Maru Gothic ProN", "Rounded Mplus 1c", "Quicksand", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};
const FONT_LABEL: Record<FontKey, string> = {
  sans: "ゴシック",
  serif: "明朝",
  rounded: "丸ゴシック",
  mono: "等幅",
};
const FONT_KEYS: FontKey[] = ["sans", "serif", "rounded", "mono"];

export function AnniversaryPage() {
  const { uuid } = useParams();
  const { data: session } = authClient.useSession();
  const [ev, setEv] = useState<LifeEvent | null | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  const [style, setStyle] = useState<StyleConfig>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uuid) return;
    getAnniversary(uuid)
      .then((e) => {
        setEv(e);
        setStyle(e.style ?? {});
      })
      .catch(() => setEv(null));
  }, [uuid]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (ev === undefined) {
    return (
      <div className="container">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }
  if (ev === null) {
    return (
      <div className="container">
        <div className="card">
          <h1>記念日が見つかりません</h1>
          <p>
            <Link to="/">← みんなの記念日へ</Link>
          </p>
        </div>
      </div>
    );
  }

  const isOwner = !!session && session.user.id === ev.userId;

  const target = new Date(`${ev.date}T00:00:00`).getTime();
  const diff = now - target;
  const past = diff >= 0;
  const total = Math.floor(Math.abs(diff) / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const font = style.font ?? "sans";
  const cardStyle: CSSProperties = {
    background: style.bg ?? undefined,
    fontFamily: FONT_FAMILY[font],
  };

  async function save() {
    if (!uuid) return;
    setSaving(true);
    try {
      await updateAnniversaryStyle(uuid, style);
      setEv((prev) => (prev ? { ...prev, style } : prev));
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <div className="card anniversary-detail" style={cardStyle}>
        <p className="muted">{ev.date}</p>
        <h1>{ev.title}</h1>
        {ev.memo && <p className="muted">{ev.memo}</p>}

        <div className="elapsed">
          <div className="elapsed-days">
            <span className="big">{days.toLocaleString()}</span>
            <span className="unit">日</span>
          </div>
          <div className="elapsed-clock">
            {pad(hours)}時間 {pad(minutes)}分 {pad(seconds)}秒
            {past ? " 経過" : " 後（未来の記念日）"}
          </div>
        </div>

        <div className="token-row">
          <code className="token-id" title={ev.uuid}>
            {ev.uuid}
          </code>
        </div>

        <p className="fineprint">
          <Link to="/">← みんなの記念日へ</Link>
        </p>
      </div>

      {isOwner && (
        <div className="card">
          <h2>このページのデザイン</h2>
          {editing ? (
            <>
              <div className="row">
                <div>
                  <label htmlFor="bg">背景色</label>
                  <input
                    id="bg"
                    type="color"
                    value={style.bg ?? "#ffffff"}
                    onChange={(e) =>
                      setStyle((s) => ({ ...s, bg: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label htmlFor="font">フォント</label>
                  <select
                    id="font"
                    value={font}
                    onChange={(e) =>
                      setStyle((s) => ({ ...s, font: e.target.value as FontKey }))
                    }
                  >
                    {FONT_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {FONT_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="token-row">
                <button className="button" onClick={save} disabled={saving}>
                  {saving ? "保存中…" : "保存"}
                </button>
                <button
                  className="linklike"
                  onClick={() => {
                    setStyle(ev.style ?? {});
                    setEditing(false);
                  }}
                >
                  やめる
                </button>
              </div>
              <p className="fineprint">選んだ内容は上のページに即プレビューされます。</p>
            </>
          ) : (
            <>
              <p className="muted">
                背景色とフォントを選んで、自分の記念日ページをデザインできます。
              </p>
              <button className="button" onClick={() => setEditing(true)}>
                デザインを編集
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
