// Cloudflare Workers の環境バインディング。
// wrangler.toml の [[d1_databases]] binding = "DB" に対応する。
export interface Env {
  DB: D1Database;
}

// ドメイン層の共通エラー。routes 側で HTTP ステータスへ変換する。
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
