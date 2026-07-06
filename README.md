# LifeEvent

人生の出来事（ライフイベント）を記録するWebサービス。

ユーザーが Google でログインし、「いつ・何があったか」を登録すると、あとから時系列（タイムライン）で振り返れる。

- フロントエンド: **React (TSX) + Vite**
- バックエンド: **Cloudflare Workers (Hono)**
- ストレージ: **Cloudflare D1**（SQLite互換）
- フロントとWorkerは `@cloudflare/vite-plugin` で1つのdev/ビルドに統合（同一オリジン）

## 特徴

- Google OAuth（Authorization Code + PKCE）でログイン、Cookieセッション
- ライフイベントの登録とタイムライン表示
- 日付は追記専用の台帳（`records`）に保存し、登録内容と突き合わせて整合性を検証

## プロジェクト構成

```
├── index.html            Vite エントリ
├── vite.config.ts        React + Cloudflare プラグイン
├── wrangler.jsonc        Worker / D1 / 静的アセット設定
├── src/                  React フロントエンド（TSX）
│   ├── App.tsx / main.tsx
│   ├── api.ts            APIクライアント
│   └── components/       LoginScreen / Home / EventForm / Timeline
├── worker/src/           Cloudflare Worker（Hono）
│   ├── index.ts / routes.ts
│   ├── auth.ts           Google OAuth + セッション
│   ├── service.ts / users.ts / ledger.ts
└── migrations/           D1 スキーマ（0001_init, 0002_auth）
```

## データ構成（Cloudflare D1: `lifeevent`）

| テーブル | 役割 |
|----------|------|
| `users` | アカウント情報 |
| `identities` | プロバイダ連携（Google の sub → user） |
| `sessions` | サーバーサイドセッション（Cookie値のハッシュを保存） |
| `life_events` | 各ライフイベントのメタデータ（種別・タイトル・メモ・日付） |
| `records` | 日付の追記専用台帳（INSERTのみ） |

## 動かし方

前提: Node.js。

```bash
npm install

# 初回：ローカル用シークレットを用意（Google未設定でもUI/疎通は動く）
cp .dev.vars.example .dev.vars

# 初回：ローカルD1にマイグレーション適用
npm run migrate:local

# 開発サーバ（Vite + Worker 統合、HMR）
npm run dev
```

ブラウザで Vite の表示するURL（既定 `http://localhost:5173`）を開く。

Googleログインを実際に動かすには、Google のOAuthクライアントを作成し `.dev.vars` に
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` を設定する（リダイレクトURIは
`http://localhost:5173/api/auth/google/callback`）。認証設計の詳細は [AUTH.md](AUTH.md)。

## HTTP API

| メソッド | パス | 内容 |
|----------|------|------|
| GET | `/api/auth/google/login` | Googleの認可画面へ |
| GET | `/api/auth/google/callback` | コールバック（セッション発行） |
| POST | `/api/auth/logout` | ログアウト |
| GET | `/api/me` | ログインユーザー情報（未ログインは401） |
| POST | `/api/me/events` | ライフイベントを記録 |
| GET | `/api/me/timeline` | タイムライン取得（検証付き） |

## デプロイ

```bash
npm run deploy   # = vite build && wrangler deploy
```

初回は本番D1の作成（`wrangler d1 create lifeevent` → `wrangler.jsonc` にID記入）、
`wrangler d1 migrations apply lifeevent --remote`、および
`wrangler secret put GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `SESSION_SECRET` が必要。

## ドキュメント

- 認証設計: [AUTH.md](AUTH.md)
- ビジュアル定義（DESIGN.md形式）: [DESIGN.md](DESIGN.md)
- 開発ガイド: [CLAUDE.md](CLAUDE.md)
