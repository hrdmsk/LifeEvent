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

export interface LedgerRecord {
  id: number;
  userId: number;
  date: string;
  hash: string;
  createdAt: string;
}

export interface TimelineEntry {
  event: LifeEvent;
  onLedger: LedgerRecord | null;
  verified: boolean;
}
