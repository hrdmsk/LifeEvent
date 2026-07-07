-- 記念日ごとに UUID を付与（将来 SBT に移行した際の Token ID の代替）。
-- 既存行は NULL のまま（新規登録から付与される）。
ALTER TABLE life_events ADD COLUMN uuid TEXT;
CREATE UNIQUE INDEX idx_events_uuid ON life_events(uuid);

-- アカウントが保持する Token ID（UUID）のコレクション。
-- SBT の「所有」に相当する概念を D1 で先取りしたもの。
CREATE TABLE saved_tokens (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  TEXT NOT NULL,          -- Better Auth の user.id
    uuid     TEXT NOT NULL,          -- life_events.uuid
    saved_at TEXT NOT NULL,
    UNIQUE(user_id, uuid)
);
CREATE INDEX idx_saved_tokens_user ON saved_tokens(user_id);
