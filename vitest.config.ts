import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      // src/server/*.ts modules import src/db/index.ts at module scope,
      // which throws immediately if DATABASE_URL is unset — even for tests
      // that only touch pure exports (e.g. challenges.test.ts importing
      // determineWinnerFromSets) and never run a query. postgres.js
      // connects lazily on first query, so a bogus-but-present URL is fine
      // here; no test in this suite talks to a real database.
      DATABASE_URL: "postgresql://test:test@localhost:5432/test_db",
    },
  },
});
