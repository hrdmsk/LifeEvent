-- 記念日に時刻（HH:MM、任意）を追加。
-- 日付(date)はコア（将来オンチェーン）の最小データとして維持し、時刻は補助情報。
ALTER TABLE life_events ADD COLUMN time TEXT;
