/**
 * Single source of truth for the E2E stack's connection details, shared by
 * global-setup, global-teardown, the Playwright webServer config, and any
 * spec that needs to reach Maildev directly. Kept separate from the app's
 * own .env — see docker-compose.e2e.yml for why these run on different
 * ports than the dev stack.
 */
export const E2E_APP_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_APP_PORT}`;

export const E2E_DATABASE_URL =
  "postgresql://pyramide_e2e:pyramide_e2e@localhost:5435/pyramide_e2e";

export const E2E_SMTP_HOST = "localhost";
export const E2E_SMTP_PORT = 1026;
export const E2E_MAILDEV_API = "http://localhost:1081";

export const E2E_ADMIN_EMAIL = "e2e-admin@example.com";
export const E2E_ADMIN_PASSWORD = "e2e-admin-password-123";

/** Env vars the Next.js dev server needs, injected by Playwright's webServer. */
export const E2E_APP_ENV: Record<string, string> = {
  DATABASE_URL: E2E_DATABASE_URL,
  AUTH_SECRET: "e2e-test-secret-not-for-production-use-only",
  NEXTAUTH_URL: E2E_BASE_URL,
  NEXT_PUBLIC_APP_URL: E2E_BASE_URL,
  SMTP_HOST: E2E_SMTP_HOST,
  SMTP_PORT: String(E2E_SMTP_PORT),
  SMTP_USER: "",
  SMTP_PASSWORD: "",
  SMTP_FROM: "Tennis-Pyramide <no-reply@example.com>",
  SEED_ADMIN_EMAIL: E2E_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
};
