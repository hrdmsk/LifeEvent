import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// React クライアント（src/）と Cloudflare Worker（worker/src/）を
// 1つの dev サーバ / ビルドに統合する。wrangler.jsonc を自動で読み込む。
export default defineConfig({
  plugins: [react(), cloudflare()],
});
