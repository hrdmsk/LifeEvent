// 日付の追記専用台帳（records テーブル）を抽象化する。
//
// 現在は D1 の records テーブルを使う実装。将来、外部の改ざん耐性ストレージへ
// 差し替えても Service 以上のコードは変更不要にするための境界。

export interface LedgerRecord {
  id: number;
  userId: number;
  date: string;
  hash: string;
  createdAt: string;
}

export interface Ledger {
  // 日付を1件追記して確定した記録を返す。
  append(userId: number, date: string): Promise<LedgerRecord>;
  // id の1件を取得する。無ければ null。
  get(id: number): Promise<LedgerRecord | null>;
  // ユーザーの全記録を追記順で返す。
  listByUser(userId: number): Promise<LedgerRecord[]>;
}

interface RecordRow {
  id: number;
  user_id: number;
  date: string;
  hash: string;
  created_at: string;
}

// D1 の records テーブルを用いた Ledger 実装（INSERT のみ）。
export class D1Ledger implements Ledger {
  constructor(private readonly db: D1Database) {}

  async append(userId: number, date: string): Promise<LedgerRecord> {
    const createdAt = new Date().toISOString();
    const hash = await computeHash(userId, date);
    const res = await this.db
      .prepare(
        "INSERT INTO records (user_id, date, hash, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(userId, date, hash, createdAt)
      .run();
    return {
      id: Number(res.meta.last_row_id),
      userId,
      date,
      hash,
      createdAt,
    };
  }

  async get(id: number): Promise<LedgerRecord | null> {
    const row = await this.db
      .prepare(
        "SELECT id, user_id, date, hash, created_at FROM records WHERE id = ?",
      )
      .bind(id)
      .first<RecordRow>();
    return row ? mapRecord(row) : null;
  }

  async listByUser(userId: number): Promise<LedgerRecord[]> {
    const { results } = await this.db
      .prepare(
        "SELECT id, user_id, date, hash, created_at FROM records WHERE user_id = ? ORDER BY id",
      )
      .bind(userId)
      .all<RecordRow>();
    return results.map(mapRecord);
  }
}

function mapRecord(row: RecordRow): LedgerRecord {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    hash: row.hash,
    createdAt: row.created_at,
  };
}

// user_id と date から SHA-256 の整合性ハッシュを算出する。
export async function computeHash(userId: number, date: string): Promise<string> {
  const data = new TextEncoder().encode(`${userId}:${date}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
