# LifeEvent 開発ガイド

ライフイベント（人生の出来事）を記録するWebサービス。
ユーザーが **World ID** でログインし、「いつ・何があったか」を登録して時系列で振り返れる。

- フロント: React (TSX) + Vite … `src/`
- バックエンド: Cloudflare Workers (Hono) … `worker/src/`
- 認証: **Better Auth**（Generic OAuth プラグインで World ID を OIDC 接続）
- ストレージ: Cloudflare D1 … `migrations/`
- フロントとWorkerは `@cloudflare/vite-plugin` で統合（同一オリジン・単一プロジェクト）

概要は [README.md](README.md)、認証設計は [AUTH.md](AUTH.md)、ビジュアル定義は [DESIGN.md](DESIGN.md)。

## セットアップ / よく使うコマンド

リポジトリのルートで実行する。

```bash
npm install
cp .dev.vars.example .dev.vars   # 初回。World ID の値は任意（未設定でもUI/疎通は動く）

npm run dev             # Vite + Worker 統合dev（既定 http://localhost:5173、HMR）
npm run typecheck       # app / worker / node の型チェック
npm run build           # vite build（client + worker を dist/ へ）
npm run migrate:local   # ローカルD1にマイグレーション適用
npm run migrate:remote  # 本番D1にマイグレーション適用
npm run deploy          # build して wrangler deploy
```

初回のローカル開発は `npm run migrate:local` → `npm run dev`。

## 認証（Better Auth + World ID）

- 実体は `worker/src/auth.ts` の `createAuth(env)`。Workers では env がリクエスト時のみのため毎回生成する。
- World ID は Better Auth の `genericOAuth` プラグインで OIDC 接続（discovery: `https://id.worldcoin.org/.well-known/openid-configuration`、PKCE有効）。
- **World ID はメールを返さない**ため、`mapProfileToUser` で `sub` から合成メール（`<sub>@worldid.local`）を割り当てる。
- Better Auth のエンドポイントは Hono で `app.on(["GET","POST"], "/api/auth/*", ...)` にマウント。
- フロントは `better-auth/react` の `authClient`（`src/authClient.ts`）。`authClient.useSession()` / `signIn.oauth2({providerId:"worldid"})` / `signOut()`。
- 保護APIは `routes.ts` の `requireAuth`（Better Auth の `getSession` で `userId` を解決、未ログイン401）。
- Google/LINE/Discord は**未使用**（AUTH.md に設計は残す）。`nodejs_compat` フラグ必須（`node:crypto` 利用のため wrangler.jsonc に設定済み）。

### スキーマの再生成

Better Auth のテーブルは `@better-auth/cli generate` で生成し、`migrations/auth/0001_betterauth.sql` に取り込んでいる。CLI用の設定は `auth.config.ts`（`better-sqlite3` を使う。実行時には無関係）。プラグイン追加等でスキーマが変わったら再生成して新しいマイグレーションに反映する。

## アーキテクチャ

- Worker（`worker/src/index.ts`）が全リクエストを受け、`/api/*` を Hono が処理、それ以外は静的アセット（React）を返す。
- 依存の向き（API側）: `routes` → `service` → (`users`=EventStore, `ledger`)。認証は `auth.ts`。

```
src/                     React フロントエンド（react-router）
  App.tsx                ルーティング（/, /login, /me）+ NavBar
  authClient.ts          better-auth/react クライアント
  api.ts                 /api/me/* と /api/public/* のクライアント
  pages/                 AnniversariesPage(/) / LoginPage(/login) / HomePage(/me・要ログイン)
  components/            NavBar / PublicAnniversaries / Home / EventForm / Timeline
worker/src/
  index.ts               Hono アプリのエントリ
  routes.ts              /api/auth/*（Better Auth）+ /api/me/* + アセットのフォールバック
  auth.ts                createAuth(env)（Better Auth + World ID）
  service.ts             業務ロジック（EventStore と Ledger を束ねる）
  users.ts               EventStore（life_events のクエリ）
  ledger.ts              Ledger インターフェース + D1実装（records）
  types.ts               Env / Variables
migrations/
  auth/0001_betterauth.sql   AUTH_DB 用
  app/0001_events.sql        APP_DB 用
auth.config.ts           Better Auth CLI（スキーマ生成）専用
```

### データモデル（D1 × 2）

認証とアプリでデータベースを分離している。D1は別DB間でFKを張れないため、
`life_events.user_id` は `user.id`(TEXT) への **FKなしソフト参照**。

- **AUTH_DB**（lifeevent-auth, `env.AUTH_DB`）: Better Auth 管理の **user** / **session** / **account** / **verification**（id は TEXT）
- **APP_DB**（lifeevent-app, `env.APP_DB`）: **life_events**（`user_id` は TEXT）/ **records**（日付の追記専用台帳・INSERTのみ）

`auth.ts` は AUTH_DB、`EventStore`/`D1Ledger` は APP_DB を使う。

### 記録フロー

1. `life_events` に `pending` で登録
2. `records` に日付を追記（Ledger.append）
3. 成功: `confirmed` + `record_id` / 失敗: `failed`

タイムライン取得時に `life_events.date` と `records.date` を突き合わせ、一致で `verified = true`
（同一D1内なので整合性チェック。DESIGN/AUTH参照）。

## コーディング規約

- **DB追加/変更は必ずマイグレーションで**。`migrations/` に連番SQLを追加し、既存ファイルは編集しない。
- **`records` は追記のみ**。読み書きは `Ledger` 経由のみ。
- D1アクセスは prepared statement（`.bind(...)`）。値を文字列連結しない。
- アプリテーブルは snake_case、TypeScript は camelCase（`mapXxx` で変換）。Better Auth テーブルは camelCase 列（BAが管理）。
- 認証必須APIは `requireAuth` を挟み `c.get("userId")`（TEXT）を使う。パスにユーザーIDを載せない。
- シークレットはコード/wrangler.jsoncに書かない。`.dev.vars`（ローカル）/ `wrangler secret`（本番）。
- `userId` は Better Auth の user.id（TEXT）。整数ではない。

## 環境変数（シークレット）

| 変数 | 用途 |
|------|------|
| `BETTER_AUTH_URL` | 例 `http://localhost:5173` / 本番ドメイン |
| `BETTER_AUTH_SECRET` | セッション署名鍵（長いランダム文字列） |
| `WORLDID_APP_ID` | World ID の app_id（OIDC client_id） |
| `WORLDID_CLIENT_SECRET` | World ID の client secret |

ローカルは `.dev.vars`、本番は `wrangler secret put <NAME>`。

## 変更後の確認

- `npm run typecheck` を通す。
- `npm run dev` を起動し疎通（ローカルD1適用済み前提）:

```bash
curl localhost:5173/api/healthz              # ok
curl -i localhost:5173/api/me                 # 未ログインは 401
curl localhost:5173/api/auth/get-session      # null（Better Auth稼働）
curl -X POST localhost:5173/api/auth/sign-in/oauth2 \
  -H 'Content-Type: application/json' -d '{"providerId":"worldid","callbackURL":"/"}'
  # → {"url":"https://id.worldcoin.org/authorize?...","redirect":true}
```

World ID の実ログインには World ID Developer Portal でアプリを作り、`.dev.vars` に app_id / secret を設定する。

## HTTP API

| メソッド | パス | 内容 |
|----------|------|------|
| GET/POST | `/api/auth/*` | Better Auth（World IDログイン・セッション） |
| GET | `/api/me` | ログインユーザー（未ログイン401） |
| POST | `/api/me/events` | イベント記録 |
| GET | `/api/me/timeline` | タイムライン取得 |
| GET/POST | `/api/public/anniversaries` | **認証なし**の公開記念日（`user_id="public"`で保存） |

> 公開記念日は認証なしで書き込める一時的な措置。POST は **IP単位で1時間に1件**のクールダウン
> （`public_rate_limit` テーブル、`routes.ts` の `PUBLIC_WRITE_COOLDOWN_MS`）。超過は 429。
> 個人タイムライン（`userTimeline` は userId で絞り込む）には混ざらない。

## デプロイ

1. 本番D1を2つ作成し `wrangler.jsonc` の各 `database_id` を設定:
   `wrangler d1 create lifeevent_auth` / `wrangler d1 create lifeevent_app`。
2. 本番D1に `npm run migrate:remote`（両DBに適用）。
3. `wrangler secret put BETTER_AUTH_URL` / `BETTER_AUTH_SECRET` / `WORLDID_APP_ID` / `WORLDID_CLIENT_SECRET`。
4. World ID Developer Portal のリダイレクトURIに `https://<domain>/api/auth/oauth2/callback/worldid` を登録。
5. `npm run deploy`。
   GitHub連携ビルド: Root directory = リポジトリルート、Build command = `npm run build`、Deploy command = `npx wrangler deploy`。

## 未確定事項

- World ID の検証レベル（現状 Device 相当。Orb 限定にするか）。
- 保留中の他プロバイダ（Google/LINE/Discord）を Better Auth に足すか。
- 強い改ざん耐性が必要か（必要なら `records` を外部台帳へ）。
