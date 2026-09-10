import "server-only";
import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { challenges, members, notifications, positionHistory, positions, seasons } from "@/db/schema";
import { getActiveSeason } from "@/server/seasons";
import { divisionSettingsSchema } from "@/lib/settings";
import { notifyInactivityWarning, notifyPositionChange } from "@/server/notifications";
import { swapMemberPositions } from "@/server/position-swap";
import { maxDate } from "@/lib/dates";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
/** Grace period after the warning before an actual demotion (PLAN.md §8.5: "Warnung, danach Abstieg" — the plan doesn't pin down how much later, so one extra week). */
const GRACE_WEEKS_AFTER_WARNING = 1;

/**
 * `positionSince` (positions.since, always set — defaultNow() at insert) is
 * the required fallback baseline, not an optional nicety: an earlier
 * version of this fell back to the Unix epoch when neither a resolved
 * challenge nor a position_history row existed, which — caught by actually
 * running the seeded app against a real DB — silently demoted every member
 * on the very first tick after a data path that skipped writing
 * position_history (it turned out src/db/seed.ts was exactly such a path;
 * now fixed there too, but this fallback stays as the real safety net).
 */
async function getLastActivityDate(
  seasonId: string,
  memberId: string,
  positionSince: Date,
): Promise<Date> {
  const [lastChallenge, lastHistoryEntry] = await Promise.all([
    db.query.challenges.findFirst({
      where: and(
        eq(challenges.seasonId, seasonId),
        or(eq(challenges.challengerId, memberId), eq(challenges.defenderId, memberId)),
        isNotNull(challenges.resolvedAt),
      ),
      orderBy: [desc(challenges.resolvedAt)],
    }),
    db.query.positionHistory.findFirst({
      where: and(eq(positionHistory.seasonId, seasonId), eq(positionHistory.memberId, memberId)),
      orderBy: [desc(positionHistory.createdAt)],
    }),
  ]);

  return maxDate(lastChallenge?.resolvedAt, lastHistoryEntry?.createdAt, positionSince);
}

async function hasRecentWarning(memberId: string, since: Date): Promise<boolean> {
  const existing = await db.query.notifications.findFirst({
    where: and(eq(notifications.memberId, memberId), eq(notifications.type, "inactivity_warning")),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
  });
  return !!existing && existing.createdAt > since;
}

/** Swaps the inactive member down into the position directly below them (same column, next row) — a no-op if there's nobody there (bottom of the pyramid). */
async function demoteForInactivity(seasonId: string, memberId: string) {
  await db.transaction(async (tx) => {
    const [memberRow] = await tx
      .select()
      .from(positions)
      .where(and(eq(positions.seasonId, seasonId), eq(positions.memberId, memberId)));
    if (!memberRow) return;

    const [belowRow] = await tx
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.seasonId, seasonId),
          eq(positions.row, memberRow.row + 1),
          eq(positions.slot, memberRow.slot),
        ),
      );
    if (!belowRow) return;

    const result = await swapMemberPositions(
      tx,
      seasonId,
      { memberId, reason: "inactivity" },
      { memberId: belowRow.memberId, reason: "inactivity" },
    );
    if (!result) return;

    await notifyPositionChange(memberId, "down", "Inaktivität");
    await notifyPositionChange(belowRow.memberId, "up", "Gegner inaktiv");
  });
}

async function checkSeason(seasonId: string) {
  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) return;
  const settings = divisionSettingsSchema.parse(season.settings ?? {});

  const rows = await db
    .select({ position: positions, member: members })
    .from(positions)
    .innerJoin(members, eq(positions.memberId, members.id))
    .where(eq(positions.seasonId, seasonId));

  const now = new Date();

  for (const { position, member } of rows) {
    if (member.onLeaveUntil && member.onLeaveUntil > now) continue;

    const lastActivity = await getLastActivityDate(seasonId, member.id, position.since);
    const weeksInactive = (now.getTime() - lastActivity.getTime()) / MS_PER_WEEK;

    if (weeksInactive < settings.inactivityWeeks) continue;

    if (weeksInactive >= settings.inactivityWeeks + GRACE_WEEKS_AFTER_WARNING) {
      await demoteForInactivity(seasonId, member.id);
    } else if (!(await hasRecentWarning(member.id, lastActivity))) {
      await notifyInactivityWarning(member.id, Math.floor(weeksInactive));
    }
  }
}

export async function runInactivityJob() {
  const allDivisions = await db.query.divisions.findMany();
  for (const division of allDivisions) {
    const season = await getActiveSeason(division.id);
    if (season) await checkSeason(season.id);
  }
}
