import "server-only";
import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { challenges, positionHistory } from "@/db/schema";

export type MemberStats = {
  wins: number;
  losses: number;
  currentStreak: { type: "win" | "loss"; count: number } | null;
  /** Lowest row number ever reached (row 1 = top) — null if never seeded/placed. */
  bestRow: number | null;
};

/**
 * Bilanz, Serie, Bestplatzierung (PLAN.md v1 "Statistik"). A
 * Positionsverlauf-Chart would need a charting library we don't have
 * installed — src/app/profil renders the raw position_history rows as a
 * simple list instead rather than pulling one in for a single sparkline.
 */
export async function getMemberStats(seasonId: string, memberId: string): Promise<MemberStats> {
  const results = await db.query.challenges.findMany({
    where: and(
      eq(challenges.seasonId, seasonId),
      eq(challenges.state, "settled"),
      ne(challenges.resolution, "cancelled"),
      or(eq(challenges.challengerId, memberId), eq(challenges.defenderId, memberId)),
    ),
    orderBy: (c, { asc }) => [asc(c.resolvedAt)],
    with: { match: true },
  });

  let wins = 0;
  let losses = 0;
  const outcomes: ("win" | "loss")[] = [];

  for (const c of results) {
    let winnerId: string | null = null;
    if (c.resolution === "walkover_challenger") winnerId = c.challengerId;
    else if (c.resolution === "walkover_defender") winnerId = c.defenderId;
    else if (c.resolution === "played") winnerId = c.match?.winnerId ?? null;
    if (!winnerId) continue;

    const won = winnerId === memberId;
    if (won) wins++;
    else losses++;
    outcomes.push(won ? "win" : "loss");
  }

  let currentStreak: MemberStats["currentStreak"] = null;
  for (let i = outcomes.length - 1; i >= 0; i--) {
    if (!currentStreak) {
      currentStreak = { type: outcomes[i], count: 1 };
    } else if (outcomes[i] === currentStreak.type) {
      currentStreak.count++;
    } else {
      break;
    }
  }

  const historyRows = await db.query.positionHistory.findMany({
    where: and(eq(positionHistory.seasonId, seasonId), eq(positionHistory.memberId, memberId)),
  });
  const bestRow = historyRows.length > 0 ? Math.min(...historyRows.map((h) => h.toRow)) : null;

  return { wins, losses, currentStreak, bestRow };
}

export async function getHeadToHead(seasonId: string, memberAId: string, memberBId: string) {
  const results = await db.query.challenges.findMany({
    where: and(
      eq(challenges.seasonId, seasonId),
      eq(challenges.state, "settled"),
      ne(challenges.resolution, "cancelled"),
      or(
        and(eq(challenges.challengerId, memberAId), eq(challenges.defenderId, memberBId)),
        and(eq(challenges.challengerId, memberBId), eq(challenges.defenderId, memberAId)),
      ),
    ),
    with: { match: true },
  });

  let aWins = 0;
  let bWins = 0;
  for (const c of results) {
    let winnerId: string | null = null;
    if (c.resolution === "walkover_challenger") winnerId = c.challengerId;
    else if (c.resolution === "walkover_defender") winnerId = c.defenderId;
    else if (c.resolution === "played") winnerId = c.match?.winnerId ?? null;
    if (winnerId === memberAId) aWins++;
    else if (winnerId === memberBId) bWins++;
  }
  return { aWins, bWins, total: results.length };
}
