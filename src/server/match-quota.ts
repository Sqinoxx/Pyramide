import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { challenges, positionHistory, seasons } from "@/db/schema";
import { divisionSettingsSchema } from "@/lib/settings";
import { evaluateMatchQuota, type MatchQuotaStatus } from "@/lib/match-quota";

/**
 * Mindestspiele-Status for every member currently placed in `seasonId`.
 * Members without a status (rule off, or "ok") are simply absent from the
 * map. Counted: played matches plus walkovers the member *won* — a walkover
 * loss means they didn't show up, so it shouldn't help them hit the quota.
 */
export async function getMatchQuotaStatuses(
  seasonId: string,
  memberIds: string[],
  now = new Date(),
): Promise<Map<string, MatchQuotaStatus>> {
  const result = new Map<string, MatchQuotaStatus>();
  if (memberIds.length === 0) return result;

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) return result;
  const settings = divisionSettingsSchema.parse(season.settings ?? {});
  if (settings.minMatchesPerYear <= 0) return result;

  const [history, resolved] = await Promise.all([
    db
      .select({ memberId: positionHistory.memberId, createdAt: positionHistory.createdAt })
      .from(positionHistory)
      .where(
        and(eq(positionHistory.seasonId, seasonId), inArray(positionHistory.memberId, memberIds)),
      ),
    db
      .select({
        challengerId: challenges.challengerId,
        defenderId: challenges.defenderId,
        resolution: challenges.resolution,
        resolvedAt: challenges.resolvedAt,
      })
      .from(challenges)
      .where(
        and(
          eq(challenges.seasonId, seasonId),
          isNotNull(challenges.resolvedAt),
          inArray(challenges.resolution, ["played", "walkover_challenger", "walkover_defender"]),
        ),
      ),
  ]);

  const anchors = new Map<string, Date>();
  for (const h of history) {
    const current = anchors.get(h.memberId);
    if (!current || h.createdAt < current) anchors.set(h.memberId, h.createdAt);
  }

  const matchDates = new Map<string, Date[]>();
  const add = (memberId: string, date: Date) => {
    const list = matchDates.get(memberId) ?? [];
    list.push(date);
    matchDates.set(memberId, list);
  };
  for (const c of resolved) {
    if (!c.resolvedAt) continue;
    if (c.resolution === "played") {
      add(c.challengerId, c.resolvedAt);
      add(c.defenderId, c.resolvedAt);
    } else if (c.resolution === "walkover_challenger") {
      add(c.challengerId, c.resolvedAt);
    } else if (c.resolution === "walkover_defender") {
      add(c.defenderId, c.resolvedAt);
    }
  }

  for (const memberId of memberIds) {
    const status = evaluateMatchQuota({
      anchor: anchors.get(memberId) ?? season.startsAt,
      now,
      matchDates: matchDates.get(memberId) ?? [],
      required: settings.minMatchesPerYear,
      warningDays: settings.minMatchesWarningDays,
    });
    if (status && status.state !== "ok") result.set(memberId, status);
  }
  return result;
}
