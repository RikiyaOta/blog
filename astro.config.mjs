import { defineConfig, memoryCache } from "astro/config";
import node from "@astrojs/node";
import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";

const isCloudflare = process.env.CLOUDFLARE === "true" || process.env.CF_PAGES === "1";

export default defineConfig({
  output: "server",
  // 画像最適化は使わないので passthrough にして Images バインディングを不要にする
  adapter: isCloudflare ? cloudflare({ imageService: "passthrough" }) : node({ mode: "standalone" }),
  // セッションは使わないので無効化 (Cloudflare では KV バインディングが不要になる)
  session: false,
  // リレーへの問い合わせ結果をページ単位でキャッシュする
  cache: {
    provider: isCloudflare ? cacheCloudflare() : memoryCache(),
  },
  devToolbar: { enabled: false },
});
