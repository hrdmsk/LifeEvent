// Better Auth CLI（スキーマ生成）専用の設定。
// 実行時の設定は worker/src/auth.ts の createAuth(env) を使う。
// ここは `npx @better-auth/cli generate` にスキーマ型を伝えるためだけのもの。
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import Database from "better-sqlite3";

export const auth = betterAuth({
  // スキーマ生成専用。実行時は worker/src/auth.ts の createAuth(env) を使う。
  database: new Database(":memory:"),
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "worldid",
          clientId: "placeholder",
          clientSecret: "placeholder",
          discoveryUrl:
            "https://id.worldcoin.org/.well-known/openid-configuration",
        },
      ],
    }),
  ],
});
