import { Hono } from "hono";
import { Service } from "./service";
import { UserStore } from "./users";
import { D1Ledger } from "./ledger";
import { NotFoundError, type Env } from "./types";

export function registerRoutes(app: Hono<{ Bindings: Env }>): void {
  const service = (env: Env) =>
    new Service(new UserStore(env.DB), new D1Ledger(env.DB));

  app.get("/", (c) => c.json({ service: "lifeevent", status: "ok" }));

  app.post("/users", async (c) => {
    const body = await c.req.json<{ email?: string; display_name?: string }>();
    if (!body.email || !body.display_name) {
      return c.json({ error: "email and display_name are required" }, 400);
    }
    const user = await service(c.env).registerUser(body.email, body.display_name);
    return c.json(user, 201);
  });

  app.post("/users/:id/events", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) {
      return c.json({ error: "invalid id" }, 400);
    }
    const body = await c.req.json<{
      event_type?: string;
      title?: string;
      memo?: string;
      date?: string;
    }>();
    if (!body.title || !body.date) {
      return c.json({ error: "title and date are required" }, 400);
    }
    try {
      const ev = await service(c.env).recordEvent(
        id,
        body.event_type ?? "",
        body.title,
        body.memo ?? "",
        body.date,
      );
      return c.json(ev, 201);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  });

  app.get("/users/:id/timeline", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) {
      return c.json({ error: "invalid id" }, 400);
    }
    const timeline = await service(c.env).userTimeline(id);
    return c.json(timeline);
  });
}
