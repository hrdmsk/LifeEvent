-- identities: プロバイダ連携（Google など）
CREATE TABLE identities (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    provider         TEXT    NOT NULL,   -- 'google'（将来 'line' / 'discord'）
    provider_user_id TEXT    NOT NULL,   -- プロバイダ側の一意ID（Googleの sub）
    email            TEXT,               -- プロバイダ上のメール（参照用）
    created_at       TEXT    NOT NULL,
    UNIQUE(provider, provider_user_id)
);
CREATE INDEX idx_identities_user ON identities(user_id);

-- sessions: サーバーサイドセッション（id は Cookie 値のハッシュを保存）
CREATE TABLE sessions (
    id         TEXT    PRIMARY KEY,       -- セッションIDの SHA-256 ハッシュ
    user_id    INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT    NOT NULL,
    expires_at TEXT    NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
