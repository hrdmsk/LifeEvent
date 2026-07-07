# LifeEvent

人生の出来事（ライフイベント）を記録するWebサービス。

ユーザーが **World ID** でログインし、「いつ・何があったか」を登録すると、あとから時系列（タイムライン）で振り返れる。

- フロントエンド: **React (TSX) + Vite**
- バックエンド: **Cloudflare Workers (Hono)**
- 認証: **Better Auth**（Generic OAuth で World ID を OIDC 接続）
- ストレージ: **Cloudflare D1**（SQLite互換）
- フロントとWorkerは `@cloudflare/vite-plugin` で1つのdev/ビルドに統合（同一オリジン）

## 特徴

- World ID でログイン（Sign in with World ID / OIDC）
- ライフイベントの登録とタイムライン表示
- 日付は追記専用の台帳（`records`）に保存し、登録内容と突き合わせて整合性を検証

## プロジェクト構成

```
├── index.html            Vite エントリ
├── vite.config.ts        React + Cloudflare プラグイン
├── wrangler.jsonc        Worker / D1 / 静的アセット設定（nodejs_compat）
├── auth.config.ts        Better Auth CLI（スキーマ生成）専用
├── src/                  React フロントエンド（TSX）
│   ├── App.tsx / main.tsx / authClient.ts / api.ts
│   └── components/       LoginScreen / Home / EventForm / Timeline
├── worker/src/           Cloudflare Worker（Hono）
│   ├── index.ts / routes.ts
│   ├── auth.ts           Better Auth + World ID
│   ├── service.ts / users.ts / ledger.ts
└── migrations/           D1 スキーマ（0001〜0003）
```

## データ構成（Cloudflare D1 × 2）

認証とアプリで**データベースを分離**している（D1は別DB間でFKを張れないため、`life_events.user_id` は
`user.id` への FKなしソフト参照）。

| DB（バインディング） | テーブル | 役割 |
|----------------------|----------|------|
| 認証 `AUTH_DB`（lifeevent-auth） | `user` / `session` / `account` / `verification` | Better Auth が管理 |
| アプリ `APP_DB`（lifeevent-app） | `life_events` | ライフイベント（時間・種別・タイトル・メモ） |
| アプリ `APP_DB`（lifeevent-app） | `records` | 日付の追記専用台帳（INSERTのみ） |

マイグレーションも DB ごと（`migrations/auth/` と `migrations/app/`）。

## 動かし方

前提: Node.js。

```bash
npm install
cp .dev.vars.example .dev.vars   # World ID 未設定でもUI/疎通は動く
npm run migrate:local            # ローカルD1にマイグレーション適用
npm run dev                      # 開発サーバ（既定 http://localhost:5173）
```

World ID の実ログインを動かすには、World ID Developer Portal でアプリを作成し `.dev.vars` に
`WORLDID_APP_ID` / `WORLDID_CLIENT_SECRET` を設定する（リダイレクトURI:
`http://localhost:5173/api/auth/oauth2/callback/worldid`）。詳細は [AUTH.md](AUTH.md)。

## HTTP API

| メソッド | パス | 内容 |
|----------|------|------|
| GET/POST | `/api/auth/*` | Better Auth（World IDログイン・セッション） |
| GET | `/api/me` | ログインユーザー情報（未ログインは401） |
| POST | `/api/me/events` | ライフイベントを記録 |
| GET | `/api/me/timeline` | タイムライン取得（検証付き） |

## デプロイ

```bash
npm run deploy   # = vite build && wrangler deploy
```

初回は **2つの本番D1を作成**して `wrangler.jsonc` の各 `database_id` を設定する。

```bash
npx wrangler d1 create lifeevent-auth   # → AUTH_DB の database_id
npx wrangler d1 create lifeevent-app    # → APP_DB の database_id
```

その後、本番D1へのマイグレーション（`npm run migrate:remote`）、シークレット登録
（`wrangler secret put BETTER_AUTH_URL` / `BETTER_AUTH_SECRET` / `WORLDID_APP_ID` / `WORLDID_CLIENT_SECRET`）、
および World ID 側の本番リダイレクトURI登録が必要。

## ドキュメント

- 認証設計: [AUTH.md](AUTH.md)
- ビジュアル定義（DESIGN.md形式）: [DESIGN.md](DESIGN.md)
- 開発ガイド: [CLAUDE.md](CLAUDE.md)
