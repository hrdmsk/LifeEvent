# LifeEvent 認証設計

ソーシャルログイン（OpenID Connect）でアカウント作成・ログインを行う設計。
**当面は Google のみ**を対象とし、Apple ID は同じ枠組みで後から追加できる形にする。

- ランタイム: Cloudflare Workers (Hono)
- ストレージ: Cloudflare D1
- 実装候補: `better-auth`（D1アダプタ + Google プロバイダ + セッション管理）を想定。
  本ドキュメントはライブラリに依存しないフロー/スキーマ設計として記述する。

## 1. 方針

- **パスワードは持たない**（ソーシャルログインのみ）。
- 1ユーザーが複数プロバイダ（将来 Google + Apple）を紐付けられるよう、
  アカウント（`users`）とプロバイダ連携（`identities`）を分離する。
- セッションは **httpOnly Cookie + D1のセッションテーブル**（サーバーサイドセッション）。
  失効・強制ログアウトを簡単にするため、JWTのみの方式より優先する。

## 2. 認証フロー（Authorization Code + PKCE）

```
[ユーザー] --"Googleでログイン"--> GET /auth/google/login
   Worker: state と PKCE(verifier) を発行し短命Cookieに保存 → Googleへリダイレクト
[Google] 同意画面 → 認可コードを付けて GET /auth/google/callback へ戻す
   Worker:
     1. Cookie の state と照合（CSRF対策）
     2. code + PKCE verifier をトークンへ交換
     3. id_token を検証（iss / aud / exp / 署名 = Google JWKS）
     4. sub(=provider_user_id) と email を取得
     5. identities を検索 → 無ければ users を作成し identities を作成（サインアップ）
                          → 有ればその user でログイン
     6. sessions を作成し、session Cookie を発行
     7. アプリ画面へリダイレクト
```

Workers はステートレスなので、`state` / PKCE verifier は**短命の署名付きCookie**（または Workers KV）に保持する。

## 3. D1 スキーマ変更（新規マイグレーション）

既存の `users` はそのまま流用し、以下を追加する。

### identities（プロバイダ連携）

| 列 | 型 | 内容 |
|----|----|------|
| id | INTEGER PK | |
| user_id | INTEGER FK→users | |
| provider | TEXT | `google`（将来 `apple`） |
| provider_user_id | TEXT | プロバイダ側の一意ID（Googleの `sub`） |
| email | TEXT | プロバイダ上のメール（参照用） |
| created_at | TEXT | |

制約: `UNIQUE(provider, provider_user_id)`

### sessions（サーバーサイドセッション）

| 列 | 型 | 内容 |
|----|----|------|
| id | TEXT PK | セッションID（Cookieに載せる乱数。DBには**ハッシュ**で保存） |
| user_id | INTEGER FK→users | |
| created_at | TEXT | |
| expires_at | TEXT | 有効期限 |

`users` は `email` を UNIQUE にしているが、複数プロバイダで同一メールが来る可能性があるため、
サインアップ時の突き合わせルール（同一メールを同一ユーザーに寄せるか別扱いにするか）は要決定（下記オープン事項）。

## 4. エンドポイント

| メソッド | パス | 内容 |
|----------|------|------|
| GET | `/auth/google/login` | Googleの認可画面へリダイレクト |
| GET | `/auth/google/callback` | コールバック。トークン交換・セッション発行 |
| POST | `/auth/logout` | セッション削除・Cookieクリア |
| GET | `/me` | 現在のログインユーザー情報 |

### 既存APIへの影響

現在 `/users/:id/events` のように**パスでユーザーを指定**しているが、認証導入後は
**セッションからユーザーを特定**する。エンドポイントは以下に変更する想定：

- `POST /me/events` … ログインユーザーのイベント記録
- `GET /me/timeline` … ログインユーザーのタイムライン

認証ミドルウェアで session Cookie → `sessions` 照合 → `context` にユーザーを載せ、
未ログインは 401 を返す。

## 5. シークレット / 設定

- `GOOGLE_CLIENT_ID`（公開値。vars でも可）
- `GOOGLE_CLIENT_SECRET` … `wrangler secret put GOOGLE_CLIENT_SECRET`（コード・wrangler.tomlに置かない）
- `SESSION_SECRET` … Cookie署名用
- リダイレクトURI:
  - 本番: `https://<worker-domain>/auth/google/callback`
  - ローカル: `http://localhost:8787/auth/google/callback`
- スコープ: `openid email profile`

## 6. セキュリティ要件

- OAuth の `state` パラメータで CSRF 対策、PKCE(S256) を使用。
- `id_token` は署名・`iss`・`aud`・`exp` を必ず検証。
- session Cookie: `HttpOnly` / `Secure` / `SameSite=Lax` / `Path=/`。
  （`Lax` はトップレベルGETのOAuthリダイレクトで機能する）
- セッションIDはDBにハッシュ保存し、有効期限を設定。ログアウトで即時失効。
- ログイン成功時にセッションを再発行（固定化攻撃対策）。

## 7. Google Cloud 側の準備

1. OAuth 同意画面を設定（アプリ名・スコープ・テストユーザー）。
2. 「OAuth 2.0 クライアント ID」を Web アプリケーションとして作成。
3. 承認済みリダイレクトURIに上記2つを登録。
4. 発行された client_id / client_secret を Worker に設定。

## 8. 将来: Apple ID の追加

同じ `identities` モデル（`provider='apple'`）で拡張できる。追加で必要になる点：

- `client_secret` を ES256 署名の JWT で動的生成（最長6か月で失効、更新運用が必要）。
- コールバックが `form_post`（POST）で返るため、`/auth/apple/callback` は POST 受けにする。
- 氏名は初回のみ返るため、初回で `users.display_name` に保存する。
- Apple Developer Program 登録が前提。
- iOSアプリでGoogleログインを出す場合、Appleの規約で Sign in with Apple の併設が実質必須。

## 9. オープン事項（実装前に決定）

- 同一メールを複数プロバイダで受けたときのアカウント統合ルール。
- セッション有効期限とリフレッシュ方針（滑走式にするか固定か）。
- ログイン後のリダイレクト先とフロントエンド構成（現状APIのみ）。
- アカウント削除・連携解除の扱い。
