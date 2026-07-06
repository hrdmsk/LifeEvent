-- 自前認証（Google手書き）から Better Auth へ移行する。
-- 旧テーブルを撤去し、Better Auth のスキーマを導入。
-- アプリのイベント/台帳は user(id=TEXT) を参照する形に張り替える（初期段階のためデータはリセット）。

DROP TABLE IF EXISTS identities;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS life_events;
DROP TABLE IF EXISTS records;
DROP TABLE IF EXISTS users;

-- === Better Auth スキーマ（@better-auth/cli generate 出力） ===
CREATE TABLE "user" (
    "id" text NOT NULL PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "emailVerified" integer NOT NULL,
    "image" text,
    "createdAt" date NOT NULL,
    "updatedAt" date NOT NULL
);

CREATE TABLE "session" (
    "id" text NOT NULL PRIMARY KEY,
    "expiresAt" date NOT NULL,
    "token" text NOT NULL UNIQUE,
    "createdAt" date NOT NULL,
    "updatedAt" date NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE "account" (
    "id" text NOT NULL PRIMARY KEY,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" date,
    "refreshTokenExpiresAt" date,
    "scope" text,
    "password" text,
    "createdAt" date NOT NULL,
    "updatedAt" date NOT NULL
);

CREATE TABLE "verification" (
    "id" text NOT NULL PRIMARY KEY,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expiresAt" date NOT NULL,
    "createdAt" date NOT NULL,
    "updatedAt" date NOT NULL
);

CREATE INDEX "session_userId_idx" ON "session" ("userId");
CREATE INDEX "account_userId_idx" ON "account" ("userId");
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");

-- === アプリスキーマ（user_id を TEXT に） ===
CREATE TABLE life_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL REFERENCES "user"("id"),
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
    user_id    TEXT    NOT NULL REFERENCES "user"("id"),
    date       TEXT    NOT NULL,
    hash       TEXT    NOT NULL,
    created_at TEXT    NOT NULL
);
CREATE INDEX idx_records_user ON records(user_id);
