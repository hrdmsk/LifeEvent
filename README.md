# LifeEvent

人生の出来事（ライフイベント）を記録するWebサービス。

ユーザーが OIDC でログインし、「いつ・何があったか」を登録すると、あとから時系列（タイムライン）で振り返れる。

- フロントエンド: **React (TSX) + Vite**
- バックエンド: **Cloudflare Workers (Hono)**
- 認証: **Better Auth**（Generic OAuth による OIDC ログイン。プロバイダは差し替え可能で、現状は一例として World ID を接続）
- ストレージ: **Cloudflare D1**（SQLite互換）
- フロントとWorkerは `@cloudflare/vite-plugin` で1つのdev/ビルドに統合（同一オリジン）

## ビジョン（このプロジェクトの原点）

**Life プロジェクト** — 記念日と、30文字までのコメントだけを残せるブロックチェーンサービス。

一度登録すると、**ブロックチェーンのトークンID**をもとに、そのコメントと「記念日とした日付」を見られる。

ただ、それだけだと物寂しい。だからトークンIDを起点に、

- その **記念日** と **コメント** をもとに、**自分でデザインした Web ページ**を設けたり
- **専用の時計のようなハードデバイス**を作ったり

——というように、**誰もが参入しやすいシステム**にしたい。
その **起点（プラットフォーム）を自分の手で作る** のが、このプロジェクトの目的。

> 現在の実装（World ID + Cloudflare D1）は、将来のブロックチェーン（SBT）移行を見据えた土台。
> 各記念日に付与している **UUID は、そのトークンIDの代替**であり、上記の「起点」に相当する。
> `/a/:uuid` の専用ページは「トークンIDから記念日・コメントを表示する」最小形。

## 特徴

- OIDC でログイン（Better Auth / Generic OAuth。現状は World ID を接続、他プロバイダも追加可能）
- ライフイベントの登録とタイムライン表示
- 日付は追記専用の台帳（`records`）に保存し、登録内容と突き合わせて整合性を検証

## 画面（ページ）

| パス | ページ | 認証 |
|------|--------|------|
| `/` | 記念日の登録（みんなの記念日・公開） | 不要 |
| `/a/:uuid` | 記念日の専用ページ（その日からの経過をライブ表示） | 不要 |
| `/login` | 認証ページ（World IDログイン） | — |
| `/me` | マイページ（個人タイムライン＋保存したToken） | 要ログイン |

## プロジェクト構成

```
├── index.html            Vite エントリ
├── vite.config.ts        React + Cloudflare プラグイン
├── wrangler.jsonc        Worker / D1 / 静的アセット設定（nodejs_compat）
├── auth.config.ts        Better Auth CLI（スキーマ生成）専用
├── src/                  React フロントエンド（TSX, react-router）
│   ├── App.tsx / main.tsx / authClient.ts / api.ts
│   ├── pages/            AnniversariesPage(/) / LoginPage(/login) / HomePage(/me)
│   └── components/       NavBar / PublicAnniversaries / Home / EventForm / Timeline
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
| アプリ `APP_DB`（lifeevent_app） | `life_events` | ライフイベント（時間・種別・タイトル・メモ、`uuid`=Token ID代替） |
| アプリ `APP_DB`（lifeevent_app） | `records` | 日付の追記専用台帳（INSERTのみ） |
| アプリ `APP_DB`（lifeevent_app） | `saved_tokens` | アカウントが保持する Token ID(UUID) のコレクション |

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
| GET/POST | `/api/public/anniversaries` | 認証なしで登録・閲覧できる公開記念日 |
| GET | `/api/public/anniversaries/:uuid` | 記念日1件（専用ページ用・公開） |
| GET/POST/DELETE | `/api/me/tokens` | 保持するToken ID(UUID)の一覧・保存・解除 |
| PUT | `/api/me/anniversaries/:uuid/style` | 専用ページのデザイン更新（所有者のみ） |

## デプロイ

```bash
npm run deploy   # = vite build && wrangler deploy
```

初回は **2つの本番D1を作成**して `wrangler.jsonc` の各 `database_id` を設定する。

```bash
npx wrangler d1 create lifeevent_auth   # → AUTH_DB の database_id
npx wrangler d1 create lifeevent_app    # → APP_DB の database_id
```

その後、本番D1へのマイグレーション（`npm run migrate:remote`）、シークレット登録
（`wrangler secret put BETTER_AUTH_URL` / `BETTER_AUTH_SECRET` / `WORLDID_APP_ID` / `WORLDID_CLIENT_SECRET`）、
および World ID 側の本番リダイレクトURI登録が必要。

## ドキュメント

- 認証設計: [AUTH.md](AUTH.md)
- ビジュアル定義（DESIGN.md形式）: [DESIGN.md](DESIGN.md)
- 開発ガイド: [CLAUDE.md](CLAUDE.md)
