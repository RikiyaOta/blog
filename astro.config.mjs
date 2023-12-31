import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: "https://blog.rikiyaota.kyoto",
  ouput: "static",
  integrations: [tailwind()],
  trailingSlash: "never",
  build: {
    format: "file",
  },
});