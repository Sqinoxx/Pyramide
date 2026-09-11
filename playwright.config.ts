import { defineConfig, devices } from "@playwright/test";
import { E2E_APP_ENV, E2E_APP_PORT, E2E_BASE_URL, E2E_DATABASE_URL } from "./e2e/env";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared e2e database — specs run in one worker to avoid cross-test interference
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "html",
  // No globalSetup here: Playwright starts webServer and runs globalSetup
  // CONCURRENTLY, not sequentially, so a separate globalSetup can't be
  // trusted to finish before webServer's `next dev` starts querying the
  // database. e2e/run-web-server.mjs does the full docker-compose+migrate+
  // seed bring-up itself, synchronously, before exec'ing into `next dev` —
  // see the comment at the top of that file.
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node e2e/run-web-server.mjs`,
    url: E2E_BASE_URL,
    timeout: 120_000,
    reuseExistingServer: false,
    env: { ...E2E_APP_ENV, DATABASE_URL: E2E_DATABASE_URL, E2E_APP_PORT: String(E2E_APP_PORT) },
  },
});
