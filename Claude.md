# LifeEvent 開発ガイド

ライフイベント（人生の出来事）を記録するWebサービス。
ユーザーが Google でログインし、「いつ・何があったか」を登録して時系列で振り返れる。

- フロント: React (TSX) + Vite … `src/`
- バックエンド: Cloudflare Workers (Hono) … `worker/src/`
- ストレージ: Cloudflare D1（SQLite互換） … `migrations/`
- フロントとWorkerは `@cloudflare/vite-plugin` で統合（同一オリジン・単一プロジェクト）

概要は [README.md](README.md)、認証設計は [AUTH.md](AUTH.md)、ビジュアル定義は [DESIGN.md](DESIGN.md)。

## セットアップ / よく使うコマンド

リポジトリのルートで実行する（`worker/` に cd しない）。

```bash
npm install
cp .dev.vars.example .dev.vars   # 初回。Googleの値は任意（未設定でもUI/疎通は動く）

npm run dev             # Vite + Worker 統合dev（既定 http://localhost:5173、HMR）
npm run typecheck       # app / worker / node の3プロジェクトを型チェック
npm run build           # vite build（client + worker を dist/ へ）
npm run migrate:local   # ローカルD1にマイグレーション適用
npm run migrate:remote  # 本番D1にマイグレーション適用
npm run deploy          # build して wrangler deploy
```

初回のローカル開発は `npm run migrate:local` → `npm run dev` の順。

## アーキテクチャ

- リクエストは Worker（`worker/src/index.ts`）が受ける。`/api/*` を Hono が処理し、
  それ以外は静的アセット（ビルドされた React）を返す（`c.env.ASSETS.fetch`）。
- 依存の向き（API側）: `routes` → `service` → (`users`, `ledger`)。認証は `auth.ts`。

```
src/                     React フロントエンド
  App.tsx                認証状態で LoginScreen / Home を出し分け
  api.ts                 /api/* のクライアント
  components/            LoginScreen / Home / EventForm / Timeline
worker/src/
  index.ts               Hono アプリのエントリ
  routes.ts              /api/* ルーティング + 静的アセットのフォールバック
  auth.ts                Google OAuth（PKCE）+ セッション + requireAuth ミドルウェア
  service.ts             業務ロジック。UserStore と Ledger を束ねる
  users.ts               users / life_events / identities / sessions のクエリ
  ledger.ts              Ledger インターフェース + D1実装（records テーブル）
  types.ts               Env / Variables / NotFoundError
migrations/
  0001_init.sql          users / life_events / records
  0002_auth.sql          identities / sessions
```

### データモデル（D1データベース `lifeevent`）

- **users**: アカウント（email / display_name）
- **identities**: プロバイダ連携（provider + provider_user_id → user）
- **sessions**: セッション（id は Cookie値の SHA-256 ハッシュ）
- **life_events**: イベントのメタデータ + `record_id` + `status`
- **records**: 日付の追記専用台帳。**INSERTのみ**（UPDATE/DELETEしない）

### 認証フロー（Google, PKCE）

1. `GET /api/auth/google/login`：state/PKCE を署名付きCookieに保存し Google へリダイレクト
2. `GET /api/auth/google/callback`：state照合 → code をトークン交換 → userinfo取得 →
   `identities` を検索/作成 → `sessions` 発行 → session Cookie を設定して `/` へ
3. `requireAuth` ミドルウェアが session Cookie から `userId` を解決（未ログインは401）

### 記録フロー

1. `life_events` に `pending` で登録
2. `records` に日付を追記（Ledger.append）
3. 成功: `confirmed` + `record_id` / 失敗: `failed`

タイムライン取得時に `life_events.date` と `records.date` を突き合わせ、一致で `verified = true`
（同一D1内なので整合性チェックであり、悪意ある改ざんの保証ではない。DESIGN/AUTH参照）。

## コーディング規約

- **DB追加/変更は必ずマイグレーションで**。`migrations/` に連番SQLを追加し、既存ファイルは編集しない。
- **`records` は追記のみ**。UPDATE/DELETE を書かない。読み書きは `Ledger` 経由のみ。
- D1アクセスは必ず prepared statement（`.bind(...)`）。値を文字列連結しない。
- テーブルは snake_case、TypeScript は camelCase。`mapXxx` で変換する。
- 認証必須のAPIは `requireAuth` を挟み、`c.get("userId")` を使う。パスにユーザーIDを載せない。
- シークレット（`GOOGLE_CLIENT_SECRET` など）はコード/wrangler.jsoncに書かない。`.dev.vars`（ローカル）/ `wrangler secret`（本番）。
- フロントの型（`src/types.ts`）はWorkerのレスポンス形（camelCase）に合わせる。

## 変更後の確認

- `npm run typecheck` を通す。
- `npm run dev` を起動し疎通（ローカルD1適用済み前提）:

```bash
curl localhost:5173/api/healthz                 # {"service":"lifeevent","status":"ok"}
curl -i localhost:5173/api/me                    # 未ログインは 401
curl -i localhost:5173/api/auth/google/login     # 302 で accounts.google.com へ
```

Googleログインの実フローの確認には、実際のOAuthクライアントを `.dev.vars` に設定する必要がある。

## HTTP API

| メソッド | パス | 内容 |
|----------|------|------|
| GET | `/api/auth/google/login` | 認可画面へ |
| GET | `/api/auth/google/callback` | コールバック（セッション発行） |
| POST | `/api/auth/logout` | ログアウト |
| GET | `/api/me` | ログインユーザー（未ログイン401） |
| POST | `/api/me/events` | イベント記録 |
| GET | `/api/me/timeline` | タイムライン取得 |

## デプロイ

1. 本番D1を作成し `wrangler.jsonc` の `database_id` を設定（設定済み）。
2. `npm run migrate:remote`。
3. `wrangler secret put GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `SESSION_SECRET`。
4. `npm run deploy`。
   GitHub連携ビルドの場合: Root directory = リポジトリルート、Build command = 空欄、Deploy command = `npx wrangler deploy`。

## 未確定事項

- LINE / Discord ログイン（AUTH.md に設計あり・現在は無効）。
- 同一メールを複数プロバイダで受けた場合のアカウント統合ルール。
- ライフイベント種別を自由文字列にするか列挙で縛るか。
- 強い改ざん耐性が必要か（必要なら `records` を外部台帳へ）。
