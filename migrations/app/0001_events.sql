-- アプリDB（APP_DB）: ライフイベント（時間）とメモ、および日付の追記台帳。
-- 認証DBとは別データベースのため、user への外部キーは張れない。
-- user_id は AUTH_DB の user.id（TEXT）を指すソフト参照。

CREATE TABLE life_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,          -- AUTH_DB の user.id を指す（FKなし）
    event_type TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    memo       TEXT    NOT NULL DEFAULT '',
    date       TEXT    NOT NULL,
    record_id  INTEGER,
    status     TEXT    NOT NULL,
    created_at TEXT    NOT NULL
);
CREATE INDEX idx_events_user ON life_events(user_id);

CREATE TABLE records (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    date       TEXT    NOT NULL,
    hash       TEXT    NOT NULL,
    created_at TEXT    NOT NULL
);
CREATE INDEX idx_records_user ON records(user_id);
