/**
 * Cron worker entrypoint — runs the daily jobs from PLAN.md §8 (deadline
 * expiry, auto-confirm, reminders, inactivity). A separate long-running
 * process/container from the Next.js app so a slow or crashing job never
 * affects request latency.
 *
 * All jobs (src/server/jobs/*) are independently idempotent, so running
 * this more often than "daily" just means faster reaction to deadlines —
 * harmless, and better for a small club where a match might get reported
 * at any hour.
 */
import { runAllJobs } from "@/server/jobs";

const TICK_MS = 15 * 60_000;

async function tick() {
  const startedAt = new Date();
  const { deadlines, reminders } = await runAllJobs();
  console.log(
    `[worker] tick ${startedAt.toISOString()} — ` +
      `accept-expired: ${deadlines?.acceptExpired ?? "?"}, ` +
      `play-expired: ${deadlines?.playExpired ?? "?"}, ` +
      `auto-confirmed: ${deadlines?.autoConfirmed ?? "?"}, ` +
      `job-errors: ${deadlines?.errors ?? "?"}, ` +
      `reminders-sent: ${reminders?.sent ?? "?"}`,
  );
}

async function main() {
  console.log("[worker] started");
  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error("[worker] tick failed", err);
    }
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
  }
}

main().catch((err) => {
  console.error("[worker] fatal error", err);
  process.exit(1);
});
