-- 公開記念日（認証なし）の登録クールダウンを IP 単位で記録する。
-- 「大事に登録してもらう」ため、1つ登録したら一定時間あけてもらう。
CREATE TABLE public_rate_limit (
    ip      TEXT PRIMARY KEY,
    last_at TEXT NOT NULL
);
