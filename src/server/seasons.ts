import "server-only";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { seasons, positions, positionHistory, members, divisions, challenges } from "@/db/schema";
import { positionOfRank, rankOf, seedPyramid, type SeedEntry } from "@/lib/pyramid";
import { getActiveItnForMember } from "./members";
import { divisionSettingsSchema, type DivisionSettings } from "@/lib/settings";
import type { MatchQuotaStatus } from "@/lib/match-quota";
import { swapMemberPositions } from "./position-swap";
import { getMatchQuotaStatuses } from "./match-quota";
import { notifyPositionChange } from "./notifications";

export async function getAllDivisions() {
  return db.query.divisions.findMany({ orderBy: (d, { asc }) => [asc(d.name)] });
}

export async function getDivisionByKey(key: "herren" | "damen") {
  return db.query.divisions.findFirst({ where: eq(divisions.key, key) });
}

export async function getActiveSeason(divisionId: string) {
  return db.query.seasons.findFirst({
    where: and(eq(seasons.divisionId, divisionId), eq(seasons.status, "active")),
  });
}

export class SeasonAlreadyActiveError extends Error {
  constructor() {
    super("Für diesen Bewerb läuft bereits eine aktive Saison");
    this.name = "SeasonAlreadyActiveError";
  }
}

/**
 * Starts a fresh season for a division and seeds every currently active
 * member into it by ITN (PLAN.md §5.3): sorted ascending (1.0 = strongest),
 * unrated members last in join order. One-shot — there's no season here to
 * seed *into* later, later joiners are appended at the bottom via
 * approveMember() in src/server/members.ts instead.
 */
export async function startSeason(divisionId: string, name: string) {
  const existing = await getActiveSeason(divisionId);
  if (existing) throw new SeasonAlreadyActiveError();

  // New seasons inherit whatever the admin last configured on /admin/regeln.
  const division = await db.query.divisions.findFirst({ where: eq(divisions.id, divisionId) });
  const settings = divisionSettingsSchema.parse(division?.settings ?? {});

  const divisionMembers = await db.query.members.findMany({
    where: and(eq(members.divisionId, divisionId), eq(members.status, "active")),
    orderBy: (m, { asc }) => [asc(m.joinedAt)],
  });

  const entries: SeedEntry[] = await Promise.all(
    divisionMembers.map(async (m, i) => {
      const activeItn = await getActiveItnForMember(m.id);
      return { memberId: m.id, itn: activeItn?.value ?? null, tiebreak: i };
    }),
  );

  return db.transaction(async (tx) => {
    const [season] = await tx
      .insert(seasons)
      .values({
        divisionId,
        name,
        startsAt: new Date(),
        status: "active",
        settings,
      })
      .returning();

    const assignment = seedPyramid(entries);
    if (assignment.size > 0) {
      const assigned = Array.from(assignment.entries());
      await tx.insert(positions).values(
        assigned.map(([memberId, pos]) => ({
          seasonId: season.id,
          memberId,
          row: pos.row,
          slot: pos.slot,
        })),
      );
      await tx.insert(positionHistory).values(
        assigned.map(([memberId, pos]) => ({
          seasonId: season.id,
          memberId,
          fromRow: null,
          fromSlot: null,
          toRow: pos.row,
          toSlot: pos.slot,
          reason: "seed" as const,
        })),
      );
    }

    return season;
  });
}

export class MemberNotInSeasonError extends Error {
  constructor() {
    super("Beide Mitglieder müssen in dieser Saison eine Position haben.");
    this.name = "MemberNotInSeasonError";
  }
}

/**
 * Direct admin correction (PLAN.md §12 phase 6): swaps two members'
 * positions outright, for cases the challenge/inactivity flows don't cover
 * (data-entry mistakes, manual adjustments after an off-platform dispute).
 * Recorded with reason "admin" so it's distinguishable from a real
 * challenge result in position_history.
 */
export async function adminSwapPositions(seasonId: string, memberAId: string, memberBId: string) {
  if (memberAId === memberBId) throw new Error("Cannot swap a member with themselves");
  const result = await db.transaction((tx) =>
    swapMemberPositions(
      tx,
      seasonId,
      { memberId: memberAId, reason: "admin" },
      { memberId: memberBId, reason: "admin" },
    ),
  );
  if (!result) throw new MemberNotInSeasonError();
  return result;
}

/**
 * The rule settings the admin sees on /admin/regeln — one set for the whole
 * club, so the public rules page can show a single set of numbers. Read from
 * the first division; saving writes the same values everywhere.
 */
export async function getRuleSettings(): Promise<DivisionSettings> {
  const [division] = await getAllDivisions();
  if (!division) return divisionSettingsSchema.parse({});
  const season = await getActiveSeason(division.id);
  return divisionSettingsSchema.parse(season?.settings ?? division.settings ?? {});
}

/**
 * Applies `patch` to every division (default for future seasons) and every
 * active season (effective immediately). Deadlines already stamped on open
 * challenges are left alone — they were promised under the old rules.
 */
export async function updateRuleSettings(patch: Partial<DivisionSettings>) {
  await db.transaction(async (tx) => {
    const allDivisions = await tx.query.divisions.findMany();
    for (const division of allDivisions) {
      const next = divisionSettingsSchema.parse({ ...(division.settings as object), ...patch });
      await tx.update(divisions).set({ settings: next }).where(eq(divisions.id, division.id));
    }
    const activeSeasons = await tx.query.seasons.findMany({ where: eq(seasons.status, "active") });
    for (const season of activeSeasons) {
      const next = divisionSettingsSchema.parse({ ...(season.settings as object), ...patch });
      await tx.update(seasons).set({ settings: next }).where(eq(seasons.id, season.id));
    }
  });
}

/**
 * Manual kick (Mindestspiele nicht erreicht, or any other admin reason):
 * removes the member's position, closes the gap by moving everyone ranked
 * below up one rank, and cancels the member's open challenges. The member
 * account itself stays active — they just no longer have a place in this
 * season's pyramid.
 */
export async function removeMemberFromPyramid(seasonId: string, memberId: string) {
  const moved = await db.transaction(async (tx) => {
    const all = await tx
      .select()
      .from(positions)
      .where(eq(positions.seasonId, seasonId))
      .for("update");
    const removed = all.find((p) => p.memberId === memberId);
    if (!removed) throw new MemberNotInSeasonError();

    await tx.delete(positions).where(eq(positions.id, removed.id));

    const removedRank = rankOf(removed);
    const below = all
      .filter((p) => rankOf(p) > removedRank)
      .sort((a, b) => rankOf(a) - rankOf(b));
    // Ascending order: each move lands on the slot the previous one just
    // vacated, so the unique (season, row, slot) index never sees a clash.
    for (const p of below) {
      const to = positionOfRank(rankOf(p) - 1);
      await tx
        .update(positions)
        .set({ row: to.row, slot: to.slot, since: new Date() })
        .where(eq(positions.id, p.id));
      await tx.insert(positionHistory).values({
        seasonId,
        memberId: p.memberId,
        fromRow: p.row,
        fromSlot: p.slot,
        toRow: to.row,
        toSlot: to.slot,
        reason: "admin",
      });
    }

    await tx
      .update(challenges)
      .set({ state: "cancelled", resolution: "cancelled", resolvedAt: new Date() })
      .where(
        and(
          eq(challenges.seasonId, seasonId),
          or(eq(challenges.challengerId, memberId), eq(challenges.defenderId, memberId)),
          inArray(challenges.state, [
            "proposed",
            "accepted",
            "reported",
            "disputed",
            "expired_accept",
            "expired_play",
          ]),
        ),
      );

    return below.map((p) => p.memberId);
  });

  for (const id of moved) {
    await notifyPositionChange(id, "up", "Spieler:in aus der Pyramide entfernt");
  }
}

export type PyramidRow = {
  row: number;
  slot: number;
  memberId: string;
  firstName: string;
  lastName: string;
  showItnPublicly: boolean;
  itn: Awaited<ReturnType<typeof getActiveItnForMember>>;
  /** Set only when the Mindestspiele rule shows an hourglass for this member. */
  quota?: MatchQuotaStatus;
};

export async function getPyramidView(divisionId: string) {
  const season = await getActiveSeason(divisionId);
  if (!season) return null;

  const rows = await db
    .select({
      row: positions.row,
      slot: positions.slot,
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      showItnPublicly: members.showItnPublicly,
    })
    .from(positions)
    .innerJoin(members, eq(positions.memberId, members.id))
    .where(eq(positions.seasonId, season.id))
    .orderBy(asc(positions.row), asc(positions.slot));

  const quota = await getMatchQuotaStatuses(
    season.id,
    rows.map((r) => r.memberId),
  );
  const withItn: PyramidRow[] = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      itn: await getActiveItnForMember(r.memberId),
      quota: quota.get(r.memberId),
    })),
  );

  return { season, rows: withItn };
}
