// Google OAuth（Authorization Code + PKCE）とセッション管理。
//
// フロー:
//   GET /api/auth/google/login    … state/PKCE を発行し Google の認可画面へ
//   GET /api/auth/google/callback … code をトークンに交換 → userinfo 取得
//                                    → users/identities を upsert → セッション発行
//   POST /api/auth/logout         … セッション削除
//
// セッションは Cookie に乱数、DBには SHA-256 ハッシュを保存する（漏洩耐性）。
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import {
  getCookie,
  setCookie,
  deleteCookie,
  getSignedCookie,
  setSignedCookie,
} from "hono/cookie";
import { UserStore } from "./users";
import type { Env, Variables } from "./types";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";

const SESSION_COOKIE = "session";
const TX_COOKIE = "oauth_tx";
const SESSION_TTL_SEC = 30 * 24 * 60 * 60; // 30日

type Ctx = Context<{ Bindings: Env; Variables: Variables }>;

interface GoogleProfile {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

// GET /api/auth/google/login
export async function googleLogin(c: Ctx): Promise<Response> {
  const url = new URL(c.req.url);
  const secure = url.protocol === "https:";
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  const state = randomString(16);
  const verifier = randomString(32);
  const challenge = await pkceChallenge(verifier);

  // state と PKCE verifier を短命の署名付きCookieに保存（CSRF対策）
  await setSignedCookie(
    c,
    TX_COOKIE,
    JSON.stringify({ state, verifier }),
    c.env.SESSION_SECRET,
    { path: "/", httpOnly: true, secure, sameSite: "Lax", maxAge: 600 },
  );

  const authUrl = new URL(GOOGLE_AUTH);
  authUrl.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  return c.redirect(authUrl.toString());
}

// GET /api/auth/google/callback
export async function googleCallback(c: Ctx): Promise<Response> {
  const url = new URL(c.req.url);
  const secure = url.protocol === "https:";
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const tx = await getSignedCookie(c, c.env.SESSION_SECRET, TX_COOKIE);
  deleteCookie(c, TX_COOKIE, { path: "/" });

  if (!code || !state || !tx) {
    return c.text("invalid oauth request", 400);
  }
  const parsed = JSON.parse(tx) as { state: string; verifier: string };
  if (parsed.state !== state) {
    return c.text("state mismatch", 400);
  }

  // code → token
  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
      code_verifier: parsed.verifier,
    }),
  });
  if (!tokenRes.ok) {
    return c.text("token exchange failed", 502);
  }
  const tokens = (await tokenRes.json()) as { access_token: string };

  // access_token → userinfo（Googleから直接TLSで取得するため安全）
  const infoRes = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) {
    return c.text("userinfo failed", 502);
  }
  const profile = (await infoRes.json()) as GoogleProfile;

  // upsert user + identity
  const store = new UserStore(c.env.DB);
  let userId = await store.findUserIdByIdentity("google", profile.sub);
  if (userId === null) {
    const user = await store.createUserWithIdentity(
      "google",
      profile.sub,
      profile.email ?? "",
      profile.name ?? profile.email ?? "User",
    );
    userId = user.id;
  }

  // セッション発行
  const sessionId = randomString(32);
  const hash = await sha256hex(sessionId);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000).toISOString();
  await store.createSession(hash, userId, expiresAt);

  setCookie(c, SESSION_COOKIE, sessionId, {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "Lax",
    maxAge: SESSION_TTL_SEC,
  });

  return c.redirect("/");
}

// POST /api/auth/logout
export async function logout(c: Ctx): Promise<Response> {
  const sid = getCookie(c, SESSION_COOKIE);
  if (sid) {
    const hash = await sha256hex(sid);
    await new UserStore(c.env.DB).deleteSession(hash);
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
}

// 認証ミドルウェア: セッションから userId を解決し context に載せる。未ログインは401。
export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const sid = getCookie(c, SESSION_COOKIE);
  if (!sid) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const hash = await sha256hex(sid);
  const userId = await new UserStore(c.env.DB).findUserIdBySession(
    hash,
    new Date().toISOString(),
  );
  if (userId === null) {
    return c.json({ error: "unauthorized" }, 401);
  }
  c.set("userId", userId);
  await next();
});

// --- crypto helpers ---

function randomString(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

function base64url(bytes: Uint8Array): string {
  const s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

async function sha256hex(input: string): Promise<string> {
  const bytes = await sha256(input);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pkceChallenge(verifier: string): Promise<string> {
  return base64url(await sha256(verifier));
}
