import type { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { Service } from "./service";
import { EventStore } from "./users";
import { D1Ledger } from "./ledger";
import type { Env, Variables } from "./types";
import { createAuth } from "./auth";

type App = Hono<{ Bindings: Env; Variables: Variables }>;

// Better Auth のセッションから userId を解決するミドルウェア。未ログインは401。
const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "unauthorized" }, 401);
    }
    c.set("userId", session.user.id);
    await next();
  },
);

// 認証なしで登録・閲覧できる「みんなの記念日」の保存先ユーザーID。
// 個人のタイムライン（userTimeline は userId で絞り込む）には混ざらない。
const PUBLIC_USER_ID = "public";

// 公開記念日の登録クールダウン（IPあたり）。一件一件を大事に登録してもらうため厳しめ。
const PUBLIC_WRITE_COOLDOWN_MS = 60 * 60 * 1000; // 1時間に1件

function clientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  return (
    c.req.header("CF-Connecting-IP") ??
    c.req.header("x-forwarded-for") ??
    "local"
  );
}

export function registerRoutes(app: App): void {
  const service = (env: Env) =>
    new Service(new EventStore(env.APP_DB), new D1Ledger(env.APP_DB));

  // Better Auth のエンドポイント（/api/auth/*）
  app.on(["GET", "POST"], "/api/auth/*", (c) =>
    createAuth(c.env).handler(c.req.raw),
  );

  // 現在のログインユーザー
  app.get("/api/me", async (c) => {
    const session = await createAuth(c.env).api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    return c.json(session.user);
  });

  // ライフイベントを記録（ログインユーザー）
  app.post("/api/me/events", requireAuth, async (c) => {
    const body = await c.req.json<{
      event_type?: string;
      title?: string;
      memo?: string;
      date?: string;
    }>();
    if (!body.title || !body.date) {
      return c.json({ error: "title and date are required" }, 400);
    }
    const ev = await service(c.env).recordEvent(
      c.get("userId"),
      body.event_type ?? "",
      body.title,
      body.memo ?? "",
      body.date,
    );
    return c.json(ev, 201);
  });

  // タイムライン（ログインユーザー、台帳検証付き）
  app.get("/api/me/timeline", requireAuth, async (c) => {
    const timeline = await service(c.env).userTimeline(c.get("userId"));
    return c.json(timeline);
  });

  // --- みんなの記念日（認証なし・公開） ---
  app.get("/api/public/anniversaries", async (c) => {
    const timeline = await service(c.env).userTimeline(PUBLIC_USER_ID);
    return c.json(timeline);
  });

  app.post("/api/public/anniversaries", async (c) => {
    const body = await c.req.json<{
      title?: string;
      memo?: string;
      date?: string;
    }>();
    if (!body.title || !body.date) {
      return c.json({ error: "title and date are required" }, 400);
    }

    // IP単位のクールダウン（大事に登録してもらうための厳しめ制限）
    const ip = clientIp(c);
    const now = Date.now();
    const row = await c.env.APP_DB.prepare(
      "SELECT last_at FROM public_rate_limit WHERE ip = ?",
    )
      .bind(ip)
      .first<{ last_at: string }>();
    if (row) {
      const elapsed = now - Date.parse(row.last_at);
      if (elapsed < PUBLIC_WRITE_COOLDOWN_MS) {
        const waitMin = Math.ceil((PUBLIC_WRITE_COOLDOWN_MS - elapsed) / 60000);
        return c.json(
          {
            error: `記念日の登録は1時間に1件までです。あと約${waitMin}分お待ちください。`,
          },
          429,
        );
      }
    }

    const ev = await service(c.env).recordEvent(
      PUBLIC_USER_ID,
      "anniversary",
      body.title,
      body.memo ?? "",
      body.date,
    );

    // 記録成功後にクールダウンを更新（失敗時は消費しない）
    await c.env.APP_DB.prepare(
      `INSERT INTO public_rate_limit (ip, last_at) VALUES (?, ?)
       ON CONFLICT(ip) DO UPDATE SET last_at = excluded.last_at`,
    )
      .bind(ip, new Date().toISOString())
      .run();

    return c.json(ev, 201);
  });

  // ヘルスチェック
  app.get("/api/healthz", (c) => c.json({ service: "lifeevent", status: "ok" }));

  // 未定義の /api/* は 404（SPAフォールバックに流さない）
  app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

  // それ以外は React クライアント（静的アセット / SPAフォールバック）
  app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));
}
