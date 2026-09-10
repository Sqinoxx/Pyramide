import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons, positions, positionHistory, members, divisions } from "@/db/schema";
import { seedPyramid, type SeedEntry } from "@/lib/pyramid";
import { getActiveItnForMember } from "./members";
import { DEFAULT_DIVISION_SETTINGS } from "@/lib/settings";
import { swapMemberPositions } from "./position-swap";

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
        settings: DEFAULT_DIVISION_SETTINGS,
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

export type PyramidRow = {
  row: number;
  slot: number;
  memberId: string;
  firstName: string;
  lastName: string;
  showItnPublicly: boolean;
  itn: Awaited<ReturnType<typeof getActiveItnForMember>>;
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

  const withItn: PyramidRow[] = await Promise.all(
    rows.map(async (r) => ({ ...r, itn: await getActiveItnForMember(r.memberId) })),
  );

  return { season, rows: withItn };
}
