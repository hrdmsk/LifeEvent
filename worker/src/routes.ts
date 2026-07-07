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

  // ヘルスチェック
  app.get("/api/healthz", (c) => c.json({ service: "lifeevent", status: "ok" }));

  // 未定義の /api/* は 404（SPAフォールバックに流さない）
  app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

  // それ以外は React クライアント（静的アセット / SPAフォールバック）
  app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));
}
