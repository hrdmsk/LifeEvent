import { Hono } from "hono";
import { registerRoutes } from "./routes";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();
registerRoutes(app);

export default app;
