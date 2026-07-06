import type { Hono } from "hono";
import { Service } from "./service";
import { UserStore } from "./users";
import { D1Ledger } from "./ledger";
import type { Env, Variables } from "./types";
import { googleLogin, googleCallback, logout, requireAuth } from "./auth";

type App = Hono<{ Bindings: Env; Variables: Variables }>;

export function registerRoutes(app: App): void {
  const service = (env: Env) =>
    new Service(new UserStore(env.DB), new D1Ledger(env.DB));

  // --- 認証 ---
  app.get("/api/auth/google/login", googleLogin);
  app.get("/api/auth/google/callback", googleCallback);
  app.post("/api/auth/logout", logout);

  // 現在のログインユーザー
  app.get("/api/me", requireAuth, async (c) => {
    const user = await new UserStore(c.env.DB).getUser(c.get("userId"));
    if (!user) return c.json({ error: "not found" }, 404);
    return c.json(user);
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

  // タイムライン（ログインユーザー、オンチェーン検証付き）
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
