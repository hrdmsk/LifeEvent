// users / life_events テーブルへのアクセス層。

export const StatusPending = "pending";
export const StatusConfirmed = "confirmed";
export const StatusFailed = "failed";

export interface User {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface LifeEvent {
  id: number;
  userId: number;
  eventType: string;
  title: string;
  memo: string;
  date: string;
  recordId: number | null;
  status: string;
  createdAt: string;
}

interface UserRow {
  id: number;
  email: string;
  display_name: string;
  created_at: string;
}

interface EventRow {
  id: number;
  user_id: number;
  event_type: string;
  title: string;
  memo: string;
  date: string;
  record_id: number | null;
  status: string;
  created_at: string;
}

export class UserStore {
  constructor(private readonly db: D1Database) {}

  async createUser(email: string, displayName: string): Promise<User> {
    const createdAt = new Date().toISOString();
    const res = await this.db
      .prepare(
        "INSERT INTO users (email, display_name, created_at) VALUES (?, ?, ?)",
      )
      .bind(email, displayName, createdAt)
      .run();
    return {
      id: Number(res.meta.last_row_id),
      email,
      displayName,
      createdAt,
    };
  }

  async getUser(id: number): Promise<User | null> {
    const row = await this.db
      .prepare(
        "SELECT id, email, display_name, created_at FROM users WHERE id = ?",
      )
      .bind(id)
      .first<UserRow>();
    return row ? mapUser(row) : null;
  }

  // イベントを pending 状態で登録する（台帳への追記前）。
  async createEvent(
    userId: number,
    eventType: string,
    title: string,
    memo: string,
    date: string,
  ): Promise<LifeEvent> {
    const createdAt = new Date().toISOString();
    const res = await this.db
      .prepare(
        `INSERT INTO life_events (user_id, event_type, title, memo, date, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(userId, eventType, title, memo, date, StatusPending, createdAt)
      .run();
    return {
      id: Number(res.meta.last_row_id),
      userId,
      eventType,
      title,
      memo,
      date,
      recordId: null,
      status: StatusPending,
      createdAt,
    };
  }

  // 台帳への追記が確定したら record_id と status を更新する。
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

  async eventsByUser(userId: number): Promise<LifeEvent[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, user_id, event_type, title, memo, date, record_id, status, created_at
         FROM life_events WHERE user_id = ? ORDER BY date, id`,
      )
      .bind(userId)
      .all<EventRow>();
    return results.map(mapEvent);
  }
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

function mapEvent(row: EventRow): LifeEvent {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    title: row.title,
    memo: row.memo,
    date: row.date,
    recordId: row.record_id,
    status: row.status,
    createdAt: row.created_at,
  };
}
