// Cloudflare Workers の環境バインディング。
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher; // ビルドされた React クライアントの静的アセット
  BETTER_AUTH_URL: string; // 例: http://localhost:5173 / https://<domain>
  BETTER_AUTH_SECRET: string; // Better Auth のセッション署名鍵
  WORLDID_APP_ID: string; // World ID の app_id（OIDC client_id）
  WORLDID_CLIENT_SECRET: string; // World ID の client secret
}

// Hono の Variables。認証ミドルウェアが現在のユーザーIDを載せる（Better Auth の user.id = TEXT）。
export interface Variables {
  userId: string;
}
