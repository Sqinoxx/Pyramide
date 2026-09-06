/**
 * Cron worker entrypoint — runs the daily jobs from PLAN.md §8 (deadline
 * expiry, auto-confirm, inactivity check, reminders). Deliberately kept as a
 * separate long-running process/container from the Next.js app so a slow or
 * crashing job never affects request latency.
 *
 * Phase 0: just a heartbeat so `docker compose up` has something real to run
 * for the `worker` service. The actual jobs are added in Phase 5, each as an
 * idempotent function under src/server/jobs/*.
 */

const TICK_MS = 60_000;

async function tick() {
   
  console.log(`[worker] tick ${new Date().toISOString()} — no jobs registered yet`);
}

async function main() {
   
  console.log("[worker] started");
   
  while (true) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
  }
}

main().catch((err) => {
   
  console.error("[worker] fatal error", err);
  process.exit(1);
});
