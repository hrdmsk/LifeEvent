// Better Auth のインスタンス生成。
//
// World ID（Sign in with World ID）を Generic OAuth プラグインで OIDC 接続する。
// World ID は疑似匿名でメールを返さないため、sub から合成メールを割り当てる。
//
// Workers では env バインディングがリクエスト時にしか得られないため、
// リクエストごとに createAuth(env) で生成する。
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { D1Dialect } from "kysely-d1";
import type { Env } from "./types";

export function createAuth(env: Env) {
  return betterAuth({
    database: {
      dialect: new D1Dialect({ database: env.DB }),
      type: "sqlite",
    },
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: "worldid",
            clientId: env.WORLDID_APP_ID,
            clientSecret: env.WORLDID_CLIENT_SECRET,
            discoveryUrl:
              "https://id.worldcoin.org/.well-known/openid-configuration",
            scopes: ["openid"],
            pkce: true,
            // World ID は email を返さないため sub から合成する
            mapProfileToUser: (profile) => ({
              email: `${profile.sub}@worldid.local`,
              name:
                typeof profile.name === "string" && profile.name
                  ? profile.name
                  : `World ID ${String(profile.sub).slice(0, 8)}`,
            }),
          },
        ],
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
