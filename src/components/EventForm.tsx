import { useState } from "react";
import type { FormEvent } from "react";
import { addEvent } from "../api";

export function EventForm({ onAdded }: { onAdded: () => void }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("other");
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!date || !title) return;
    setBusy(true);
    try {
      await addEvent({ event_type: type, title, memo, date, time });
      setTitle("");
      setMemo("");
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>できごとを記録</h2>
      <div className="row">
        <div>
          <label htmlFor="date">日付</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="time">時刻（任意）</label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="type">種別</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="birth">誕生</option>
            <option value="graduation">卒業</option>
            <option value="marriage">結婚</option>
            <option value="job">仕事</option>
            <option value="other">その他</option>
          </select>
        </div>
      </div>
      <label htmlFor="title">タイトル</label>
      <input
        id="title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="例: 大学を卒業した"
      />
      <label htmlFor="memo">メモ（任意）</label>
      <textarea
        id="memo"
        rows={2}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />
      <button className="button" type="submit" disabled={busy}>
        {busy ? "記録中…" : "記録する"}
      </button>
    </form>
  );
}
