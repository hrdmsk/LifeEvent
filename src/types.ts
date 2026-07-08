export type FontKey = "sans" | "serif" | "rounded" | "mono";

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
  time: string; // HH:MM（任意。未指定は ""）
  recordId: number | null;
  status: string;
  createdAt: string;
  style: StyleConfig | null;
}

export interface SavedToken {
  uuid: string;
  savedAt: string;
  title: string;
  date: string;
  time: string;
  memo: string;
  eventType: string;
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
