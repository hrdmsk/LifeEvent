# LifeEvent

人生の出来事（ライフイベント）を記録するWebサービス。

ユーザーが「いつ・何があったか」を登録すると、あとから時系列（タイムライン）で振り返れる。

日付とアカウント情報は **Cloudflare D1** に保存する。ランタイムは **Cloudflare Workers (TypeScript)**。

実装は [worker/](worker/) にある。

## 特徴

- ライフイベントの登録とタイムライン表示
- 日付は追記専用の台帳（`records`）に保存し、登録内容と突き合わせて整合性を検証
- アカウント・イベント・台帳を Cloudflare D1 の各テーブルに保持

## データ構成（Cloudflare D1）

D1データベース `lifeevent` に3テーブルを持つ。

| テーブル | 役割 |
|----------|------|
| `users` | アカウント情報 |
| `life_events` | 各ライフイベントのメタデータ（種別・タイトル・メモ・日付） |
| `records` | 日付の追記専用台帳（INSERTのみ） |

`records` には**日付だけ**を保存し、種別やタイトルなど個人に紐づく情報は `life_events` 側にのみ置く。

## 動かし方（Cloudflare Workers）

前提: Node.js と wrangler。詳細は [worker/README.md](worker/README.md) を参照。

```bash
cd worker
npm install
npm run migrate:local   # ローカルD1にマイグレーション適用
npm run dev             # ローカル開発サーバ起動
npm run deploy          # 本番デプロイ
```

## HTTP API

| メソッド | パス | 内容 |
|----------|------|------|
| POST | `/users` | ユーザー登録 |
| POST | `/users/{id}/events` | ライフイベントを記録 |
| GET | `/users/{id}/timeline` | タイムライン取得（検証付き） |

リクエスト例:

```bash
curl -X POST localhost:8787/users \
  -d '{"email":"a@example.com","display_name":"デモ太郎"}'

curl -X POST localhost:8787/users/1/events \
  -d '{"event_type":"birth","title":"生まれた","date":"1990-04-01"}'

curl localhost:8787/users/1/timeline
```

## 技術構成

- ランタイム: Cloudflare Workers (TypeScript)
- Webフレームワーク: Hono
- ストレージ: Cloudflare D1（SQLite互換）
- ローカル開発 / デプロイ: wrangler

詳細な設計は [Desgin.md](Desgin.md) を参照。
