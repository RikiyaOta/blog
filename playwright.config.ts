import { defineConfig, devices } from "@playwright/test";
import { TEST_NPUB, MOCK_RELAY_PORT, MOCK_RELAY_URL } from "./tests/fixtures.mjs";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node tests/mock-relay.mjs",
      port: MOCK_RELAY_PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm exec astro dev --host 127.0.0.1 --ignore-lock",
      url: "http://127.0.0.1:4321",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        NOSTR_NPUB: TEST_NPUB,
        NOSTR_RELAYS: MOCK_RELAY_URL,
      },
    },
  ],
});
