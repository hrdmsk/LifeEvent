// EventStore と Ledger を束ねる業務ロジック層。
//
// 記録フロー: life_events を pending 登録 → Ledger へ追記 →
//   成功なら confirmed + record_id、失敗なら failed。
// ユーザーは Better Auth のセッション由来（userId は user.id = TEXT）。

import type { Ledger, LedgerRecord } from "./ledger";
import { EventStore, StatusConfirmed, type LifeEvent } from "./users";

export interface TimelineEntry {
  event: LifeEvent;
  onLedger: LedgerRecord | null;
  verified: boolean;
}

export class Service {
  constructor(
    private readonly events: EventStore,
    private readonly ledger: Ledger,
  ) {}

  async recordEvent(
    userId: string,
    eventType: string,
    title: string,
    memo: string,
    date: string,
  ): Promise<LifeEvent> {
    const ev = await this.events.createEvent(
      userId,
      eventType,
      title,
      memo,
      date,
    );
    try {
      const record = await this.ledger.append(userId, date);
      await this.events.markConfirmed(ev.id, record.id);
      ev.recordId = record.id;
      ev.status = StatusConfirmed;
      return ev;
    } catch (err) {
      await this.events.markFailed(ev.id);
      throw err;
    }
  }

  async userTimeline(userId: string): Promise<TimelineEntry[]> {
    const events = await this.events.eventsByUser(userId);
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
