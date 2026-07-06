# LifeEvent 認証設計

ソーシャルログインでアカウント作成・ログインを行う設計。
対象プロバイダは **Google / LINE / Discord** の3種（いずれも無料）で、同じ枠組み（`identities` テーブル）で扱う。

**現在の有効プロバイダは Google のみ。LINE / Discord は設計を残したまま無効化**しておく。
有効/無効はコードのプロバイダ設定（レジストリ）で切り替える想定で、後から有効化するだけで使えるようにする。

| プロバイダ | 状態 |
|------------|------|
| Google | 有効 |
| LINE | 無効（設計のみ・将来有効化） |
| Discord | 無効（設計のみ・将来有効化） |

- ランタイム: Cloudflare Workers (Hono)
- ストレージ: Cloudflare D1
- 実装候補: `better-auth`（D1アダプタ + 各ソーシャルプロバイダ + セッション管理）を想定。
  本ドキュメントはライブラリに依存しないフロー/スキーマ設計として記述する。

## 1. 方針

- **パスワードは持たない**（ソーシャルログインのみ）。
- 1ユーザーが複数プロバイダ（Google / LINE / Discord）を紐付けられるよう、
  アカウント（`users`）とプロバイダ連携（`identities`）を分離する。
- セッションは **httpOnly Cookie + D1のセッションテーブル**（サーバーサイドセッション）。
  失効・強制ログアウトを簡単にするため、JWTのみの方式より優先する。

## 2. 認証フロー（Authorization Code + PKCE）

プロバイダ非依存の共通フロー。エンドポイントは `:provider` で切り替える。

```
[ユーザー] --"◯◯でログイン"--> GET /auth/:provider/login
   Worker: state と PKCE(verifier) を発行し短命Cookieに保存 → プロバイダの認可画面へ
[プロバイダ] 同意 → 認可コードを付けて GET /auth/:provider/callback へ戻す
   Worker:
     1. Cookie の state と照合（CSRF対策）
     2. code + PKCE verifier をトークンへ交換
     3. ユーザー情報を取得（provider_user_id と email、表示名）
        - OIDC(Google/LINE): id_token を検証して取り出す
        - Discord: access_token で userinfo API を呼ぶ
     4. identities を検索 → 無ければ users を作成し identities を作成（サインアップ）
                          → 有ればその user でログイン
     5. sessions を作成し、session Cookie を発行
     6. アプリ画面へリダイレクト
```

Workers はステートレスなので、`state` / PKCE verifier は**短命の署名付きCookie**（または Workers KV）に保持する。
3プロバイダとも **GETコールバック**なので、コールバックの受け方は共通化できる。

## 3. プロバイダ別の要点

| 項目 | Google | LINE Login | Discord |
|------|--------|------------|---------|
| 種別 | OIDC | OIDC | OAuth2（id_tokenなし） |
| 認可エンドポイント | accounts.google.com/o/oauth2/v2/auth | access.line.me/oauth2/v2.1/authorize | discord.com/oauth2/authorize |
| トークン | oauth2.googleapis.com/token | api.line.me/oauth2/v2.1/token | discord.com/api/oauth2/token |
| ユーザー取得 | id_token | id_token | GET discord.com/api/users/@me |
| スコープ | openid email profile | openid profile email | identify email |
| provider_user_id | id_token.sub | id_token.sub（LINE userId） | users/@me の id（snowflake） |
| PKCE | 対応 | 対応 | 対応 |

### プロバイダ固有の注意

- **LINE**: メールアドレス取得には LINE Developers コンソールで **「メールアドレス取得権限」の申請**が必要（申請なしだと `email` は返らない）。`id_token` は LINE の仕様に沿って検証する。LINE Login チャネルを作成しておく。
- **Discord**: OIDCではないため `id_token` は無い。取得した `access_token` で `users/@me` を呼び、`id` / `email` / `username` を得る。`email` は未認証の場合があるため `verified` フラグを確認する。
- **Google**: OIDC標準。`id_token` を JWKS で検証。

## 4. D1 スキーマ変更（新規マイグレーション）

既存の `users` はそのまま流用し、以下を追加する。

### identities（プロバイダ連携）

| 列 | 型 | 内容 |
|----|----|------|
| id | INTEGER PK | |
| user_id | INTEGER FK→users | |
| provider | TEXT | `google` / `line` / `discord` |
| provider_user_id | TEXT | プロバイダ側の一意ID |
| email | TEXT | プロバイダ上のメール（参照用、無い場合あり） |
| created_at | TEXT | |

制約: `UNIQUE(provider, provider_user_id)`

### sessions（サーバーサイドセッション）

| 列 | 型 | 内容 |
|----|----|------|
| id | TEXT PK | セッションID（Cookieに載せる乱数。DBには**ハッシュ**で保存） |
| user_id | INTEGER FK→users | |
| created_at | TEXT | |
| expires_at | TEXT | 有効期限 |

`users.email` は UNIQUE だが、プロバイダによっては email が取得できない/未認証のことがある。
サインアップ時の突き合わせルール（同一メールを同一ユーザーに寄せるか別扱いにするか）は要決定（下記オープン事項）。

## 5. エンドポイント

| メソッド | パス | 内容 |
|----------|------|------|
| GET | `/auth/:provider/login` | 認可画面へリダイレクト（provider = google / line / discord） |
| GET | `/auth/:provider/callback` | コールバック。トークン交換・セッション発行 |
| POST | `/auth/logout` | セッション削除・Cookieクリア |
| GET | `/me` | 現在のログインユーザー情報 |

### 既存APIへの影響

現在 `/users/:id/events` のように**パスでユーザーを指定**しているが、認証導入後は
**セッションからユーザーを特定**する。エンドポイントは以下に変更する想定：

- `POST /me/events` … ログインユーザーのイベント記録
- `GET /me/timeline` … ログインユーザーのタイムライン

認証ミドルウェアで session Cookie → `sessions` 照合 → `context` にユーザーを載せ、
未ログインは 401 を返す。

## 6. シークレット / 設定

各プロバイダごとに client_id / client_secret を持つ。secret は `wrangler secret put` で保管。
**現在必要なのは Google と SESSION_SECRET のみ**。LINE / Discord は有効化する時に設定する。

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` … 現在必要
- `SESSION_SECRET`（Cookie署名用）… 現在必要
- `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` … 有効化時
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` … 有効化時
- リダイレクトURI（各プロバイダのコンソールに登録）:
  - 本番: `https://<worker-domain>/auth/<provider>/callback`
  - ローカル: `http://localhost:8787/auth/<provider>/callback`

## 7. セキュリティ要件

- OAuth の `state` で CSRF 対策、PKCE(S256) を全プロバイダで使用。
- OIDC（Google/LINE）は `id_token` の署名・`iss`・`aud`・`exp` を検証。
- Discord は userinfo 取得を TLS 経由で行い、`email` は `verified` を確認。
- session Cookie: `HttpOnly` / `Secure` / `SameSite=Lax` / `Path=/`。
- セッションIDはDBにハッシュ保存し、有効期限を設定。ログアウトで即時失効。
- ログイン成功時にセッションを再発行（固定化攻撃対策）。

## 8. 各プロバイダ側の準備

- **Google**: OAuth同意画面設定 → OAuth 2.0 クライアントID（Webアプリ）作成 → リダイレクトURI登録。
- **LINE**: LINE Developers で Provider 作成 → LINE Login チャネル作成 → コールバックURL登録 →（メールが必要なら）メールアドレス取得権限を申請。
- **Discord**: Discord Developer Portal で Application 作成 → OAuth2 の Redirect を登録 → scope `identify email` を設定。

## 9. 将来: 他プロバイダの追加

同じ `identities` モデルで拡張できる。候補と注意：

- **Yahoo! JAPAN ID**（無料・OIDC）: 日本の裾野拡大に。
- **Apple ID**（有料/年99ドル）: `client_secret` を ES256 の JWT で動的生成、コールバックが `form_post`(POST)、氏名は初回のみ、と扱いが重い。必要になった時点で追加。

## 10. オープン事項（実装前に決定）

- 同一メールを複数プロバイダで受けたときのアカウント統合ルール（Discordは未認証メールがあり得る点に注意）。
- LINE のメールアドレス取得権限を申請するか（しない場合、LINEユーザーは email なしで運用）。
- セッション有効期限とリフレッシュ方針。
- ログイン後のリダイレクト先とフロントエンド構成（現状APIのみ）。
- アカウント削除・連携解除の扱い。
