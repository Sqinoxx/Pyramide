import "server-only";
import {
  autoConfirmResult,
  expireAcceptDeadline,
  expirePlayDeadline,
  findExpiredAcceptChallenges,
  findExpiredPlayChallenges,
  findUnconfirmedReports,
} from "@/server/challenges";

/**
 * Daily jobs from PLAN.md §8, items 1-3. Each challenge is processed in its
 * own try/catch so one bad row can't block the rest of the batch — errors
 * are logged and picked up again on the next run (idempotent: a challenge
 * that's already moved out of the matched state is a no-op, see the guards
 * at the top of each expire-deadline / auto-confirm function).
 */
export async function runDeadlineJobs() {
  const results = { acceptExpired: 0, playExpired: 0, autoConfirmed: 0, errors: 0 };

  for (const id of await findExpiredAcceptChallenges()) {
    try {
      await expireAcceptDeadline(id);
      results.acceptExpired++;
    } catch (err) {
      results.errors++;
      console.error(`[jobs] expireAcceptDeadline(${id}) failed`, err);
    }
  }

  for (const id of await findExpiredPlayChallenges()) {
    try {
      await expirePlayDeadline(id);
      results.playExpired++;
    } catch (err) {
      results.errors++;
      console.error(`[jobs] expirePlayDeadline(${id}) failed`, err);
    }
  }

  for (const id of await findUnconfirmedReports()) {
    try {
      await autoConfirmResult(id);
      results.autoConfirmed++;
    } catch (err) {
      results.errors++;
      console.error(`[jobs] autoConfirmResult(${id}) failed`, err);
    }
  }

  return results;
}
