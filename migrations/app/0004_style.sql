-- 記念日の専用ページのデザイン設定（JSON）。
-- 現時点はフォントと背景色のみ。例: {"bg":"#fff7ed","font":"serif"}
ALTER TABLE life_events ADD COLUMN style TEXT;
