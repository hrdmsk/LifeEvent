# LifeEvent 開発ガイド

ライフイベント（人生の出来事）を記録するWebサービス。
ユーザーが「いつ・何があったか」を登録し、時系列で振り返れる。

- ランタイム: Cloudflare Workers (TypeScript)
- Webフレームワーク: Hono
- ストレージ: Cloudflare D1（SQLite互換）
- 実装はすべて [worker/](worker/) 配下

概要は [README.md](README.md)、設計は [Desgin.md](Desgin.md) を参照。

## セットアップ / よく使うコマンド

`worker/` で実行する。

```bash
cd worker
npm install

npm run dev             # ローカル開発サーバ（http://localhost:8787）
npm run typecheck       # tsc --noEmit（型チェック）
npm run migrate:local   # ローカルD1にマイグレーション適用
npm run migrate:remote  # 本番D1にマイグレーション適用
npm run deploy          # Cloudflareへデプロイ
```

初回のローカル開発は `npm run migrate:local` → `npm run dev` の順。

## アーキテクチャ

依存の向き: `routes` → `service` → (`users`, `ledger`)。

```
worker/src/
  index.ts    Hono アプリのエントリ。registerRoutes を呼ぶだけ
  routes.ts   HTTPルーティング。リクエスト検証と Service 呼び出し、エラー→ステータス変換
  service.ts  業務ロジック。UserStore と Ledger を束ねる
  users.ts    users / life_events テーブルへのクエリ（UserStore）
  ledger.ts   Ledger インターフェース + D1実装（records テーブル）
  types.ts    Env バインディング / NotFoundError
worker/migrations/
  0001_init.sql   users / life_events / records
```

### データモデル（D1データベース `lifeevent`）

- **users**: アカウント（email / display_name）
- **life_events**: イベントのメタデータ（種別・タイトル・メモ・日付）+ `record_id` + `status`
- **records**: 日付の追記専用台帳。**INSERTのみ**（UPDATE/DELETEしない）

種別・タイトルなど個人に紐づく情報は `life_events` にのみ持ち、`records` には日付だけを載せる。

### 記録フロー

1. `life_events` に `pending` で登録
2. `records` に日付を追記（Ledger.append）
3. 成功: `life_events` を `confirmed` + `record_id` に更新 / 失敗: `failed`

### 検証

タイムライン取得時に `life_events.date` と `records.date` を突き合わせ、一致すれば `verified = true`。
※ 同一D1内のため、これは整合性チェックであり悪意ある改ざんへの保証ではない（詳細は Desgin.md 5章）。

## コーディング規約

- **DB追加/変更は必ずマイグレーションで**。`migrations/` に連番SQL（`0002_...sql`）を追加し、既存ファイルは編集しない。
- **`records` は追記のみ**。UPDATE/DELETE を書かない（台帳の不変性を守る）。
- D1アクセスは必ず prepared statement（`.bind(...)`）を使い、値を文字列連結しない。
- テーブルは snake_case、TypeScript は camelCase。境界（`users.ts` / `ledger.ts` の `mapXxx`）で変換する。
- `records` への読み書きは `Ledger` インターフェース経由でのみ行う（将来の差し替え点。直接クエリしない）。
- ドメインエラーは `types.ts` のエラー型（例: `NotFoundError`）を投げ、`routes.ts` でHTTPステータスに変換する。

## 変更後の確認

- コード変更後は `npm run typecheck` を通す。
- 挙動確認は `npm run dev` を起動し、以下で疎通する（ローカルD1にマイグレーション適用済みが前提）。

```bash
curl -X POST localhost:8787/users -d '{"email":"a@b.jp","display_name":"Taro"}'
curl -X POST localhost:8787/users/1/events -d '{"event_type":"birth","title":"born","date":"1990-04-01"}'
curl localhost:8787/users/1/timeline
```

## HTTP API

| メソッド | パス | 内容 |
|----------|------|------|
| POST | `/users` | ユーザー登録 |
| POST | `/users/:id/events` | ライフイベントを記録 |
| GET | `/users/:id/timeline` | タイムライン取得（検証付き） |

## デプロイ

1. `npx wrangler d1 create lifeevent` でD1を作成し、出力された `database_id` を [worker/wrangler.toml](worker/wrangler.toml) の `REPLACE_WITH_YOUR_D1_DATABASE_ID` に設定。
2. `npm run migrate:remote` → `npm run deploy`。

## 未確定事項（着手前に方針確認が必要）

- 認証: ソーシャルログイン。現在は Google のみ有効、LINE / Discord は設計を残し無効化。設計は [AUTH.md](AUTH.md)。実装は未着手
- ライフイベント種別を自由文字列にするか列挙で縛るか
- 同一ユーザーの記録が紐づくことのプライバシー配慮
- 強い改ざん耐性が必要か（必要なら `records` を外部台帳へ差し替え）
