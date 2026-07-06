export interface LifeEvent {
  id: number;
  userId: string;
  eventType: string;
  title: string;
  memo: string;
  date: string;
  recordId: number | null;
  status: string;
  createdAt: string;
}

export interface LedgerRecord {
  id: number;
  userId: string;
  date: string;
  hash: string;
  createdAt: string;
}

export interface TimelineEntry {
  event: LifeEvent;
  onLedger: LedgerRecord | null;
  verified: boolean;
}
