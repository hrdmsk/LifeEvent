import { Hono } from "hono";
import { registerRoutes } from "./routes";
import type { Env, Variables } from "./types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
registerRoutes(app);

export default app;
