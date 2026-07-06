import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

// 同一オリジンの Worker（/api/auth/*）に接続する Better Auth クライアント。
export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
});
