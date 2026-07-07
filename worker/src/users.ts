// life_events テーブルへのアクセス層。
// users / sessions / account 等は Better Auth（"user" テーブル等）が管理する。

export const StatusPending = "pending";
export const StatusConfirmed = "confirmed";
export const StatusFailed = "failed";

export const FONTS = ["sans", "serif", "rounded", "mono"] as const;
export type FontKey = (typeof FONTS)[number];

// 専用ページのデザイン設定（現時点はフォントと背景色のみ）
export interface StyleConfig {
  bg?: string;
  font?: FontKey;
}

export interface LifeEvent {
  id: number;
  uuid: string; // 記念日ごとの一意ID（将来のSBT Token IDの代替）
  userId: string;
  eventType: string;
  title: string;
  memo: string;
  date: string;
  recordId: number | null;
  status: string;
  createdAt: string;
  style: StyleConfig | null;
}

interface EventRow {
  id: number;
  uuid: string | null;
  user_id: string;
  event_type: string;
  title: string;
  memo: string;
  date: string;
  record_id: number | null;
  status: string;
  created_at: string;
  style: string | null;
}

// 受け取った任意の値から、許可したキーだけの安全な StyleConfig を作る。
export function sanitizeStyle(input: unknown): StyleConfig {
  const src = (input ?? {}) as Record<string, unknown>;
  const out: StyleConfig = {};
  // 背景色: #rgb / #rrggbb のみ許可
  if (typeof src.bg === "string" && /^#[0-9a-fA-F]{3,8}$/.test(src.bg)) {
    out.bg = src.bg;
  }
  if (typeof src.font === "string" && (FONTS as readonly string[]).includes(src.font)) {
    out.font = src.font as FontKey;
  }
  return out;
}

function parseStyle(raw: string | null): StyleConfig | null {
  if (!raw) return null;
  try {
    return sanitizeStyle(JSON.parse(raw));
  } catch {
    return null;
  }
}

export class EventStore {
  constructor(private readonly db: D1Database) {}

  // イベントを pending 状態で登録する（台帳への追記前）。UUID を採番する。
  async createEvent(
    userId: string,
    eventType: string,
    title: string,
    memo: string,
    date: string,
  ): Promise<LifeEvent> {
    const createdAt = new Date().toISOString();
    const uuid = crypto.randomUUID();
    const res = await this.db
      .prepare(
        `INSERT INTO life_events (uuid, user_id, event_type, title, memo, date, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(uuid, userId, eventType, title, memo, date, StatusPending, createdAt)
      .run();
    return {
      id: Number(res.meta.last_row_id),
      uuid,
      userId,
      eventType,
      title,
      memo,
      date,
      recordId: null,
      status: StatusPending,
      createdAt,
      style: null,
    };
  }

  // 所有者だけが自分の記念日のデザインを更新できる。更新できたら true。
  async updateStyle(
    uuid: string,
    userId: string,
    style: StyleConfig,
  ): Promise<boolean> {
    const res = await this.db
      .prepare("UPDATE life_events SET style = ? WHERE uuid = ? AND user_id = ?")
      .bind(JSON.stringify(style), uuid, userId)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  async markConfirmed(eventId: number, recordId: number): Promise<void> {
    await this.db
      .prepare("UPDATE life_events SET record_id = ?, status = ? WHERE id = ?")
      .bind(recordId, StatusConfirmed, eventId)
      .run();
  }

  async markFailed(eventId: number): Promise<void> {
    await this.db
      .prepare("UPDATE life_events SET status = ? WHERE id = ?")
      .bind(StatusFailed, eventId)
      .run();
  }

  // UUID で1件取得（記念日の専用ページ用）。
  async getByUuid(uuid: string): Promise<LifeEvent | null> {
    const row = await this.db
      .prepare(
        `SELECT id, uuid, user_id, event_type, title, memo, date, record_id, status, created_at, style
         FROM life_events WHERE uuid = ?`,
      )
      .bind(uuid)
      .first<EventRow>();
    return row ? mapEvent(row) : null;
  }

  async eventsByUser(userId: string): Promise<LifeEvent[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, uuid, user_id, event_type, title, memo, date, record_id, status, created_at, style
         FROM life_events WHERE user_id = ? ORDER BY date, id`,
      )
      .bind(userId)
      .all<EventRow>();
    return results.map(mapEvent);
  }
}

export function mapEvent(row: EventRow): LifeEvent {
  return {
    id: row.id,
    uuid: row.uuid ?? "",
    userId: row.user_id,
    eventType: row.event_type,
    title: row.title,
    memo: row.memo,
    date: row.date,
    recordId: row.record_id,
    status: row.status,
    createdAt: row.created_at,
    style: parseStyle(row.style),
  };
}
