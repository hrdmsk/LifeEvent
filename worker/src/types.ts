// Cloudflare Workers の環境バインディング。
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher; // ビルドされた React クライアントの静的アセット
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string; // OAuth トランザクション用の署名付きCookieに使用
}

// Hono の Variables。認証ミドルウェアが現在のユーザーを載せる。
export interface Variables {
  userId: number;
}

// ドメイン層の共通エラー。routes 側で HTTP ステータスへ変換する。
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
