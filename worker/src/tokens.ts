// アカウントが保持する Token ID（UUID）のコレクション。
// saved_tokens と life_events を突き合わせて中身を返す。

export interface SavedToken {
  uuid: string;
  savedAt: string;
  title: string;
  date: string;
  time: string;
  memo: string;
  eventType: string;
}

interface SavedRow {
  uuid: string;
  saved_at: string;
  title: string;
  date: string;
  time: string | null;
  memo: string;
  event_type: string;
}

export class TokenStore {
  constructor(private readonly db: D1Database) {}

  // UUID が実在する記念日か確認する。
  async eventExists(uuid: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT 1 AS ok FROM life_events WHERE uuid = ?")
      .bind(uuid)
      .first<{ ok: number }>();
    return row !== null;
  }

  // アカウントに UUID を保存（重複は無視）。
  async save(userId: string, uuid: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO saved_tokens (user_id, uuid, saved_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id, uuid) DO NOTHING`,
      )
      .bind(userId, uuid, new Date().toISOString())
      .run();
  }

  async remove(userId: string, uuid: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM saved_tokens WHERE user_id = ? AND uuid = ?")
      .bind(userId, uuid)
      .run();
  }

  // 保存済みの Token を、記念日の中身付きで返す。
  async list(userId: string): Promise<SavedToken[]> {
    const { results } = await this.db
      .prepare(
        `SELECT s.uuid AS uuid, s.saved_at AS saved_at,
                e.title AS title, e.date AS date, e.time AS time, e.memo AS memo, e.event_type AS event_type
         FROM saved_tokens s
         JOIN life_events e ON e.uuid = s.uuid
         WHERE s.user_id = ?
         ORDER BY s.saved_at DESC`,
      )
      .bind(userId)
      .all<SavedRow>();
    return results.map((r) => ({
      uuid: r.uuid,
      savedAt: r.saved_at,
      title: r.title,
      date: r.date,
      time: r.time ?? "",
      memo: r.memo,
      eventType: r.event_type,
    }));
  }
}
