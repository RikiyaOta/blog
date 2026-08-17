import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import cloudflare from "@astrojs/cloudflare";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";
import { d1, r2 } from "@emdash-cms/cloudflare";

const isCloudflare = process.env.CLOUDFLARE === "true" || process.env.CF_PAGES === "1";

export default defineConfig({
  output: "server",
  adapter: isCloudflare ? cloudflare() : node({ mode: "standalone" }),
  experimental: {
    liveContentCollections: true,
  },
  image: {
    layout: "constrained",
    responsiveStyles: true,
  },
  vite: {
    ssr: {
      optimizeDeps: {
        disabled: true,
      },
    },
  },
  integrations: [
    react(),
    emdash(
      isCloudflare
        ? {
            database: d1({ binding: "DB", session: "auto" }),
            storage: r2({ binding: "MEDIA" }),
          }
        : {
            database: sqlite({ url: "file:./data.db" }),
            storage: local({
              directory: "./uploads",
              baseUrl: "/_emdash/api/media/file",
            }),
          }
    ),
  ],
  devToolbar: { enabled: false },
});
