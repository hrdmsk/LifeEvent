// UserStore と Ledger を束ねる業務ロジック層。
//
// 記録フロー: life_events を pending 登録 → Ledger へ追記 →
//   成功なら confirmed + record_id、失敗なら failed。

import type { Ledger, LedgerRecord } from "./ledger";
import {
  StatusConfirmed,
  UserStore,
  type LifeEvent,
  type User,
} from "./users";
import { NotFoundError } from "./types";

export interface TimelineEntry {
  event: LifeEvent;
  onLedger: LedgerRecord | null; // 確定済みなら台帳の記録
  verified: boolean; // life_events.date と台帳の date が一致するか
}

export class Service {
  constructor(
    private readonly users: UserStore,
    private readonly ledger: Ledger,
  ) {}

  registerUser(email: string, displayName: string): Promise<User> {
    return this.users.createUser(email, displayName);
  }

  async recordEvent(
    userId: number,
    eventType: string,
    title: string,
    memo: string,
    date: string,
  ): Promise<LifeEvent> {
    const user = await this.users.getUser(userId);
    if (!user) {
      throw new NotFoundError("user not found");
    }

    const ev = await this.users.createEvent(
      userId,
      eventType,
      title,
      memo,
      date,
    );

    try {
      const record = await this.ledger.append(userId, date);
      await this.users.markConfirmed(ev.id, record.id);
      ev.recordId = record.id;
      ev.status = StatusConfirmed;
      return ev;
    } catch (err) {
      await this.users.markFailed(ev.id);
      throw err;
    }
  }

  async userTimeline(userId: number): Promise<TimelineEntry[]> {
    const events = await this.users.eventsByUser(userId);
    const out: TimelineEntry[] = [];
    for (const event of events) {
      let onLedger: LedgerRecord | null = null;
      let verified = false;
      if (event.recordId !== null) {
        onLedger = await this.ledger.get(event.recordId);
        verified = onLedger !== null && onLedger.date === event.date;
      }
      out.push({ event, onLedger, verified });
    }
    return out;
  }
}
