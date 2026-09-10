import "server-only";
import { runDeadlineJobs } from "./deadlines";
import { runReminderJobs } from "./reminders";
import { runInactivityJob } from "./inactivity";

/**
 * All daily jobs from PLAN.md §8, run as one batch by src/worker/index.ts.
 * Each sub-job is independently idempotent and already isolates per-item
 * failures, so a problem in one never stops the others here.
 */
export async function runAllJobs() {
  const deadlines = await runDeadlineJobs().catch((err) => {
    console.error("[jobs] runDeadlineJobs failed", err);
    return null;
  });
  const reminders = await runReminderJobs().catch((err) => {
    console.error("[jobs] runReminderJobs failed", err);
    return null;
  });
  await runInactivityJob().catch((err) => {
    console.error("[jobs] runInactivityJob failed", err);
  });

  return { deadlines, reminders };
}
