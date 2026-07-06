# LifeEvent Worker

Cloudflare Workers (TypeScript) + D1 実装。

## セットアップ

```bash
cd worker
npm install
```

## ローカル開発

```bash
# ローカルD1にマイグレーションを適用
npm run migrate:local

# 開発サーバ起動（ローカルSQLiteでD1を再現）
npm run dev
```

## 本番へのデプロイ

1. D1データベースを作成し、出力された database_id を wrangler.toml に設定する。

   ```bash
   npx wrangler d1 create lifeevent
   ```

2. マイグレーション適用とデプロイ。

   ```bash
   npm run migrate:remote
   npm run deploy
   ```

## API

| メソッド | パス | 内容 |
|----------|------|------|
| POST | `/users` | ユーザー登録 |
| POST | `/users/:id/events` | ライフイベントを記録 |
| GET | `/users/:id/timeline` | タイムライン取得（検証付き） |

```bash
curl -X POST localhost:8787/users \
  -d '{"email":"a@example.com","display_name":"デモ太郎"}'

curl -X POST localhost:8787/users/1/events \
  -d '{"event_type":"birth","title":"生まれた","date":"1990-04-01"}'

curl localhost:8787/users/1/timeline
```

## 構成

```
src/
  index.ts    Hono アプリのエントリ
  routes.ts   ルーティング
  service.ts  業務ロジック（users + ledger）
  ledger.ts   Ledger インターフェース + D1実装（records テーブル）
  users.ts    users / life_events のクエリ
  types.ts    Env バインディング / 共通エラー
migrations/
  0001_init.sql
```
