# LifeEvent

記念日（人生の出来事）を記録するWebサービス。

記念日と短いコメントを登録すると、記念日ごとに **Token ID（UUID）** が発行され、
専用ページでその日時からの経過をいつでも見られる。

- フロントエンド: **React (TSX) + Vite + react-router**
- バックエンド: **Cloudflare Workers (Hono)**
- 認証: **Better Auth**（Generic OAuth による OIDC ログイン。プロバイダは差し替え可能で、現状は一例として World ID を接続）
- ストレージ: **Cloudflare D1**（SQLite互換、認証用とアプリ用の2つ）
- フロントとWorkerは `@cloudflare/vite-plugin` で1つのdev/ビルドに統合（同一オリジン）

## ビジョン（このプロジェクトの原点）

**Life プロジェクト** — 記念日と、30文字までのコメントだけを残せるブロックチェーンサービス。

一度登録すると、**ブロックチェーンのトークンID**をもとに、そのコメントと「記念日とした日付」を見られる。

ただ、それだけだと物寂しい。だからトークンIDを起点に、

- その **記念日** と **コメント** をもとに、**自分でデザインした Web ページ**を設けたり
- **専用の時計のようなハードデバイス**を作ったり

——というように、**誰もが参入しやすいシステム**にしたい。
その **起点（プラットフォーム）を自分の手で作る** のが、このプロジェクトの目的。

### 3層アーキテクチャと現在の実装の対応

| 層 | ビジョン | 現在の実装 |
|----|----------|-----------|
| 第1層 コア | ブロックチェーン（SBT）。消えない石碑 | Cloudflare D1（`life_events` + 追記専用台帳 `records`）。`uuid` が Token ID の代替 |
| 第2層 ハブ | チェーンを読み軽いJSONに翻訳するAPI | Worker の公開API（`/api/public/anniversaries/:uuid` 等） |
| 第3層 エッジ | Webページ / ハードデバイス | `/a/:uuid` 専用ページ（経過表示＋所有者デザイン）。デバイスは将来 |

> 永続性・非中央集権などの性質は SBT 移行後に実現される。現在は移行を見据えた機能プロトタイプ。
> 課題の全体像は [Task.md](Task.md) を参照。

## 現在の機能

- **記念日の登録（認証不要）**: 日付＋時刻（任意）＋名前＋ひとこと。入力 → **内容確認** → 登録の3ステップ
- **レート制限**: 公開登録は IP あたり **1時間に1件**（一つずつ大事に登録してもらうため。超過は429）
- **Token ID（UUID）**: 登録ごとに発行。将来のSBT Token IDの代替
- **専用ページ** `/a/:uuid`: 登録日時からの経過（日・時間・分・秒）をライブ表示
- **ページデザイン**: 所有者は専用ページの背景色とフォント（4種）をカスタマイズ可能
- **公開タイムライン** `/timeline`: 登録済みの記念日一覧
- **アカウント（OIDCログイン）**: 個人のライフイベント記録＋気に入った記念日の Token ID をコレクション
- **整合性検証**: 日付は追記専用台帳（`records`）にも記録し、突き合わせて `verified` を返す

## 画面（ページ）

| パス | ページ | 認証 |
|------|--------|------|
| `/` | 記念日の登録（入力 → 内容確認 → 登録。時刻も任意で登録可） | 不要 |
| `/timeline` | みんなの記念日タイムライン（登録済みの一覧） | 不要 |
| `/a/:uuid` | 記念日の専用ページ（経過のライブ表示＋所有者はデザイン編集） | 不要（編集は所有者のみ） |
| `/login` | 認証ページ（OIDCログイン） | — |
| `/me` | マイページ（個人タイムライン＋保存したToken一覧） | 要ログイン |

## プロジェクト構成

```
├── index.html            Vite エントリ
├── vite.config.ts        React + Cloudflare プラグイン
├── wrangler.jsonc        Worker / D1×2 / 静的アセット設定（nodejs_compat）
├── auth.config.ts        Better Auth CLI（スキーマ生成）専用
├── Task.md               課題管理（細分化した残タスク）
├── src/                  React フロントエンド（TSX, react-router）
│   ├── App.tsx / main.tsx / authClient.ts / api.ts / types.ts
│   ├── pages/            AnniversariesPage(/) / TimelinePage(/timeline) /
│   │                     AnniversaryPage(/a/:uuid) / LoginPage(/login) / HomePage(/me)
│   └── components/       NavBar / AnniversaryForm(確認ステップ付き) / PublicTimeline /
│                         Home / EventForm / Timeline / SavedTokens
├── worker/src/           Cloudflare Worker（Hono）
│   ├── index.ts / routes.ts   ルーティング（/api/* + SPAフォールバック）
│   ├── auth.ts                Better Auth（OIDC、現状 World ID）
│   ├── service.ts             記録フロー（pending → confirmed/failed）
│   ├── users.ts               EventStore（life_events、uuid採番、style、time検証）
│   ├── ledger.ts              Ledger 抽象化 + D1実装（records、将来チェーンへ差し替え）
│   └── tokens.ts              TokenStore（saved_tokens）
└── migrations/
    ├── auth/             0001_betterauth
    └── app/              0001_events / 0002_public_rate_limit / 0003_tokens /
                          0004_style / 0005_time
```

## データ構成（Cloudflare D1 × 2）

認証とアプリで**データベースを分離**している（D1は別DB間でFKを張れないため、`life_events.user_id` は
`user.id` への FKなしソフト参照）。

| DB（バインディング） | テーブル | 役割 |
|----------------------|----------|------|
| 認証 `AUTH_DB`（lifeevent_auth） | `user` / `session` / `account` / `verification` | Better Auth が管理 |
| アプリ `APP_DB`（lifeevent_app） | `life_events` | 記念日本体。`uuid`（Token ID代替）/ 日付 / 時刻（任意）/ 種別 / タイトル / ひとこと / `style`（背景色・フォント） |
| アプリ `APP_DB`（lifeevent_app） | `records` | 日付の追記専用台帳（INSERTのみ・UPDATE/DELETEしない） |
| アプリ `APP_DB`（lifeevent_app） | `saved_tokens` | アカウントが保持する Token ID(UUID) のコレクション |
| アプリ `APP_DB`（lifeevent_app） | `public_rate_limit` | 公開登録のIPクールダウン（1時間に1件） |

マイグレーションも DB ごと（`migrations/auth/` と `migrations/app/`）。

### 記録フロー

1. `life_events` に `pending` で登録（UUID採番）
2. `records` に日付を追記（Ledger 経由。将来ここがブロックチェーンに差し替わる）
3. 成功: `confirmed` + `record_id` / 失敗: `failed`

## 動かし方

前提: Node.js。

```bash
npm install
cp .dev.vars.example .dev.vars   # OIDC未設定でも登録・閲覧は動く
npm run migrate:local            # ローカルD1（2つ）にマイグレーション適用
npm run dev                      # 開発サーバ（既定 http://localhost:5173）
```

OIDCログインを実際に動かすには、プロバイダ（現状 World ID）のコンソールでアプリを作成し
`.dev.vars` に `WORLDID_APP_ID` / `WORLDID_CLIENT_SECRET` を設定する（リダイレクトURI:
`http://localhost:5173/api/auth/oauth2/callback/worldid`）。詳細は [AUTH.md](AUTH.md)。

## HTTP API

| メソッド | パス | 内容 |
|----------|------|------|
| GET/POST | `/api/auth/*` | Better Auth（OIDCログイン・セッション） |
| GET | `/api/me` | ログインユーザー情報（未ログインは401） |
| POST | `/api/me/events` | ライフイベントを記録（date + time任意） |
| GET | `/api/me/timeline` | 個人タイムライン（検証付き） |
| GET/POST | `/api/public/anniversaries` | 公開記念日の一覧 / 登録（認証不要。POSTはIPあたり1時間1件） |
| GET | `/api/public/anniversaries/:uuid` | 記念日1件（専用ページ・デバイス向け・公開） |
| GET/POST/DELETE | `/api/me/tokens` | 保持するToken ID(UUID)の一覧・保存・解除 |
| PUT | `/api/me/anniversaries/:uuid/style` | 専用ページのデザイン更新（所有者のみ・背景色/フォント） |

## デプロイ

GitHub連携（Workers Builds）: Root directory = リポジトリルート / Build command = `npm run build` /
Deploy command = `npx wrangler deploy`。

CLIから手動の場合:

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
および OIDC プロバイダ側の本番リダイレクトURI登録が必要。
（GitHub連携ビルドはマイグレーションとシークレット登録を行わないため、これらはCLIで実施する）

## ドキュメント

- 課題管理: [Task.md](Task.md)
- 認証設計: [AUTH.md](AUTH.md)
- ビジュアル定義（DESIGN.md形式）: [DESIGN.md](DESIGN.md)
- 開発ガイド: [CLAUDE.md](CLAUDE.md)
