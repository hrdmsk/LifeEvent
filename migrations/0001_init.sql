-- users: account info
CREATE TABLE users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT    NOT NULL UNIQUE,
    display_name TEXT    NOT NULL,
    created_at   TEXT    NOT NULL
);

-- life_events: event metadata (kept off the ledger)
CREATE TABLE life_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    event_type TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    memo       TEXT    NOT NULL DEFAULT '',
    date       TEXT    NOT NULL,
    record_id  INTEGER,
    status     TEXT    NOT NULL,
    created_at TEXT    NOT NULL
);
CREATE INDEX idx_events_user ON life_events(user_id);

-- records: append-only date ledger (INSERT only by convention)
CREATE TABLE records (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    date       TEXT    NOT NULL,
    hash       TEXT    NOT NULL,
    created_at TEXT    NOT NULL
);
CREATE INDEX idx_records_user ON records(user_id);
