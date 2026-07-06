// ブラウザで表示するプレビュー画面（1枚のHTML）。
// DESIGN.md のトークン（色・角丸・余白・タイポ）をそのまま反映している。
//
// 認証は未実装のため、当面はデモ用ユーザーを localStorage に保持して動かす。
// 認証導入後は、この画面のユーザー管理をセッションベースへ置き換える。

export const indexHtml = /* html */ `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>LifeEvent</title>
<style>
  :root {
    --bg: #f8fafc;
    --surface: #ffffff;
    --text: #111827;
    --muted: #6b7280;
    --border: #d1d5db;
    --primary: #2563eb;
    --radius: 1rem;
    --shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
  }
  .container { width: min(100%, 1080px); margin: 0 auto; padding: 2rem; }
  h1 { font-size: 2rem; margin: 0 0 0.25rem; }
  .lead { color: var(--muted); margin: 0 0 2rem; }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  .card h2 { font-size: 1.125rem; margin: 0 0 1rem; }
  label { display: block; font-size: 0.9rem; color: var(--muted); margin: 0.75rem 0 0.25rem; }
  input, select, textarea {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    font: inherit;
    background: var(--surface);
    color: var(--text);
  }
  .row { display: flex; gap: 1rem; flex-wrap: wrap; }
  .row > div { flex: 1 1 12rem; }
  .button {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem 1.25rem;
    color: #ffffff; background: var(--primary);
    border: none; border-radius: 9999px; cursor: pointer;
    text-decoration: none; font: inherit;
  }
  .button:disabled { opacity: 0.5; cursor: default; }
  .muted { color: var(--muted); font-size: 0.95rem; }
  .timeline-item { border-left: 3px solid var(--primary); padding-left: 1rem; margin-bottom: 1.5rem; }
  .timeline-item h3 { margin: 0 0 0.25rem; font-size: 1.125rem; }
  .timeline-item time { display: block; color: var(--muted); font-size: 0.95rem; }
  .badge { font-size: 0.8rem; color: var(--primary); }
  .hidden { display: none; }
  #whoami { margin-bottom: 2rem; }
</style>
</head>
<body>
  <div class="container">
    <h1>LifeEvent</h1>
    <p class="lead">人生の出来事を記録して、時系列で振り返る。</p>

    <div id="signup" class="card hidden">
      <h2>アカウント作成</h2>
      <div class="row">
        <div>
          <label for="email">メールアドレス</label>
          <input id="email" type="email" placeholder="you@example.com" />
        </div>
        <div>
          <label for="name">表示名</label>
          <input id="name" type="text" placeholder="なまえ" />
        </div>
      </div>
      <button class="button" id="createUser">はじめる</button>
    </div>

    <p id="whoami" class="muted hidden"></p>

    <div id="app" class="hidden">
      <div class="card">
        <h2>できごとを記録</h2>
        <div class="row">
          <div>
            <label for="date">日付</label>
            <input id="date" type="date" />
          </div>
          <div>
            <label for="type">種別</label>
            <select id="type">
              <option value="birth">誕生</option>
              <option value="graduation">卒業</option>
              <option value="marriage">結婚</option>
              <option value="job">仕事</option>
              <option value="other" selected>その他</option>
            </select>
          </div>
        </div>
        <label for="title">タイトル</label>
        <input id="title" type="text" placeholder="例: 大学を卒業した" />
        <label for="memo">メモ（任意）</label>
        <textarea id="memo" rows="2" placeholder=""></textarea>
        <button class="button" id="addEvent">記録する</button>
      </div>

      <div class="card">
        <h2>タイムライン</h2>
        <div id="timeline"><p class="muted">まだ記録がありません。</p></div>
      </div>
    </div>
  </div>

<script>
  const $ = (id) => document.getElementById(id);
  let userId = localStorage.getItem("lifeevent_user_id");
  let userName = localStorage.getItem("lifeevent_user_name") || "";

  function render() {
    if (userId) {
      $("signup").classList.add("hidden");
      $("app").classList.remove("hidden");
      $("whoami").classList.remove("hidden");
      $("whoami").textContent = userName + " としてログイン中（デモ）";
      loadTimeline();
    } else {
      $("signup").classList.remove("hidden");
      $("app").classList.add("hidden");
      $("whoami").classList.add("hidden");
    }
  }

  async function createUser() {
    const email = $("email").value.trim();
    const display_name = $("name").value.trim();
    if (!email || !display_name) { alert("メールと表示名を入力してください"); return; }
    const res = await fetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, display_name }),
    });
    if (!res.ok) { alert("作成に失敗しました"); return; }
    const user = await res.json();
    userId = String(user.id);
    userName = user.displayName;
    localStorage.setItem("lifeevent_user_id", userId);
    localStorage.setItem("lifeevent_user_name", userName);
    render();
  }

  async function addEvent() {
    const date = $("date").value;
    const title = $("title").value.trim();
    if (!date || !title) { alert("日付とタイトルは必須です"); return; }
    const res = await fetch("/users/" + userId + "/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: $("type").value,
        title,
        memo: $("memo").value.trim(),
        date,
      }),
    });
    if (!res.ok) { alert("記録に失敗しました"); return; }
    $("title").value = ""; $("memo").value = "";
    loadTimeline();
  }

  async function loadTimeline() {
    const res = await fetch("/users/" + userId + "/timeline");
    const items = await res.json();
    const el = $("timeline");
    if (!items.length) { el.innerHTML = '<p class="muted">まだ記録がありません。</p>'; return; }
    el.innerHTML = items.map((it) => {
      const ev = it.event;
      const verified = it.verified ? '<span class="badge">✓ 検証OK</span>' : "";
      return '<div class="timeline-item">' +
        "<time>" + ev.date + "</time>" +
        "<h3>" + escapeHtml(ev.title) + " " + verified + "</h3>" +
        (ev.memo ? '<p class="muted">' + escapeHtml(ev.memo) + "</p>" : "") +
        "</div>";
    }).join("");
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  $("createUser").addEventListener("click", createUser);
  $("addEvent").addEventListener("click", addEvent);
  render();
</script>
</body>
</html>`;
