import "server-only";
import { and, eq, gt, lte } from "drizzle-orm";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { notifyDeadlineReminder, hasDeadlineReminderBeenSent } from "@/server/notifications";

const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * 48h-before-deadline reminders (PLAN.md §8.4). Simplified from the plan's
 * "48h before deadline / 24h before the agreed match time" to a single 48h
 * window for both the accept- and play-deadline: there's no scheduling
 * feature yet (challenges.scheduledAt is defined in the schema but nothing
 * writes to it), so "24h before the agreed time" has no data to key off.
 */
export async function runReminderJobs() {
  const now = new Date();
  const soon = new Date(now.getTime() + REMINDER_WINDOW_MS);
  let sent = 0;

  const proposedSoon = await db.query.challenges.findMany({
    where: and(
      eq(challenges.state, "proposed"),
      gt(challenges.acceptDeadline, now),
      lte(challenges.acceptDeadline, soon),
    ),
    with: { challenger: true, defender: true },
  });
  for (const c of proposedSoon) {
    if (await hasDeadlineReminderBeenSent(c.defenderId, c.id, "accept")) continue;
    await notifyDeadlineReminder(
      c.defenderId,
      c.id,
      "accept",
      `${c.challenger.firstName} ${c.challenger.lastName}`,
      c.acceptDeadline,
    );
    sent++;
  }

  const acceptedSoon = await db.query.challenges.findMany({
    where: and(
      eq(challenges.state, "accepted"),
      gt(challenges.playDeadline, now),
      lte(challenges.playDeadline, soon),
    ),
    with: { challenger: true, defender: true },
  });
  for (const c of acceptedSoon) {
    if (!c.playDeadline) continue;
    for (const [memberId, opponent] of [
      [c.challengerId, c.defender],
      [c.defenderId, c.challenger],
    ] as const) {
      if (await hasDeadlineReminderBeenSent(memberId, c.id, "play")) continue;
      await notifyDeadlineReminder(
        memberId,
        c.id,
        "play",
        `${opponent.firstName} ${opponent.lastName}`,
        c.playDeadline,
      );
      sent++;
    }
  }

  return { sent };
}
