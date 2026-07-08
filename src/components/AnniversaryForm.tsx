import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { addPublicAnniversary } from "../api";

type Step = "input" | "confirm" | "done";

// みんなの記念日の登録フォーム（入力 → 内容確認 → 登録）。
export function AnniversaryForm() {
  const [step, setStep] = useState<Step>("input");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  function toConfirm(e: FormEvent) {
    e.preventDefault();
    if (!date || !title.trim()) {
      alert("日付と記念日の名前は必須です");
      return;
    }
    setStep("confirm");
  }

  async function submit() {
    setBusy(true);
    try {
      await addPublicAnniversary({
        title: title.trim(),
        memo: memo.trim(),
        date,
        time,
      });
      setStep("done");
    } catch (err) {
      alert(err instanceof Error ? err.message : "登録に失敗しました");
      setStep("input");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDate("");
    setTime("");
    setTitle("");
    setMemo("");
    setStep("input");
  }

  if (step === "done") {
    return (
      <div className="card">
        <h2>登録しました 🎉</h2>
        <p className="muted">記念日を大切に登録いただきありがとうございます。</p>
        <div className="token-row">
          <Link className="button" to="/timeline">
            タイムラインで見る
          </Link>
          <button className="linklike" onClick={reset}>
            続けて登録する（1時間に1件まで）
          </button>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="card">
        <h2>登録内容の確認</h2>
        <p className="muted">
          この内容で登録します。登録した記念日は削除できません。よくご確認ください。
        </p>
        <dl className="confirm-list">
          <div>
            <dt>日付</dt>
            <dd>
              {date}
              {time && ` ${time}`}
            </dd>
          </div>
          <div>
            <dt>記念日の名前</dt>
            <dd>{title.trim()}</dd>
          </div>
          <div>
            <dt>ひとこと</dt>
            <dd>{memo.trim() || <span className="muted">（なし）</span>}</dd>
          </div>
        </dl>
        <div className="token-row">
          <button className="button" onClick={submit} disabled={busy}>
            {busy ? "登録中…" : "この内容で登録する"}
          </button>
          <button className="linklike" onClick={() => setStep("input")}>
            修正する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>記念日を登録</h2>
      <p className="muted">
        ログインなしで登録できます。ひとつずつ大事に登録できるよう、登録は1時間に1件までです。
      </p>
      <form onSubmit={toConfirm}>
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
            <label htmlFor="pub-time">時刻（任意）</label>
            <input
              id="pub-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <label htmlFor="pub-title">記念日の名前</label>
        <input
          id="pub-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 猫の日"
        />
        <label htmlFor="pub-memo">ひとこと（任意）</label>
        <input
          id="pub-memo"
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <button className="button" type="submit">
          内容を確認する
        </button>
      </form>
    </div>
  );
}
