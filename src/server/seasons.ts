import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { seasons, positions, positionHistory, members, divisions, challenges } from "@/db/schema";
import { seedPyramid, type SeedEntry } from "@/lib/pyramid";
import { getActiveItnForMember } from "./members";
import { divisionSettingsSchema, type DivisionSettings } from "@/lib/settings";
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

/**
 * The rules a division's *next* season starts with. Stored on the division
 * so they survive between seasons; the active season carries its own copy
 * (seasons.settings) which is what the challenge engine actually reads.
 */
export async function getDivisionSettings(divisionId: string): Promise<DivisionSettings> {
  const division = await db.query.divisions.findFirst({ where: eq(divisions.id, divisionId) });
  return divisionSettingsSchema.parse(division?.settings ?? {});
}

/**
 * Admin rule change. Always updates the division default; with
 * `applyToActiveSeason` it also rewrites the running season's copy, which
 * takes effect immediately (deadlines of already-open challenges were
 * computed when they were created and stay as they are).
 */
export async function updateDivisionSettings(
  divisionId: string,
  settings: DivisionSettings,
  applyToActiveSeason: boolean,
) {
  const next = divisionSettingsSchema.parse(settings);
  return db.transaction(async (tx) => {
    await tx.update(divisions).set({ settings: next }).where(eq(divisions.id, divisionId));
    if (!applyToActiveSeason) return null;

    const season = await tx.query.seasons.findFirst({
      where: and(eq(seasons.divisionId, divisionId), eq(seasons.status, "active")),
    });
    if (!season) return null;

    const prev = divisionSettingsSchema.parse(season.settings ?? {});
    const resumed = prev.challengesPaused && !next.challengesPaused;
    await tx
      .update(seasons)
      .set({
        settings: {
          ...next,
          inactivityCountFrom: resumed ? new Date() : prev.inactivityCountFrom,
        },
      })
      .where(eq(seasons.id, season.id));
    return season.id;
  });
}

/** "Alle starten bei null": nobody is inactive before now. */
export async function resetInactivityCounter(seasonId: string) {
  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) return;
  const current = divisionSettingsSchema.parse(season.settings ?? {});
  await db
    .update(seasons)
    .set({ settings: { ...current, inactivityCountFrom: new Date() } })
    .where(eq(seasons.id, seasonId));
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
  const settings = await getDivisionSettings(divisionId);

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

// Everything that isn't final yet — see OPEN_STATES in ./challenges.ts.
const UNRESOLVED_CHALLENGE_STATES = [
  "proposed",
  "accepted",
  "reported",
  "disputed",
  "expired_accept",
  "expired_play",
] as const;

/**
 * Closes the active season so a new one can be started. Challenges still in
 * flight are cancelled without any position change — a season end is a
 * hard cut, results nobody confirmed in time simply don't count.
 */
export async function endSeason(seasonId: string) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [season] = await tx
      .update(seasons)
      .set({ status: "closed", endsAt: now })
      .where(and(eq(seasons.id, seasonId), eq(seasons.status, "active")))
      .returning();
    if (!season) return null;

    const cancelled = await tx
      .update(challenges)
      .set({ state: "cancelled", resolution: "cancelled", resolvedAt: now })
      .where(
        and(
          eq(challenges.seasonId, seasonId),
          inArray(challenges.state, [...UNRESOLVED_CHALLENGE_STATES]),
        ),
      )
      .returning({ id: challenges.id });

    return { season, cancelledChallenges: cancelled.length };
  });
}

export async function renameSeason(seasonId: string, name: string) {
  await db.update(seasons).set({ name }).where(eq(seasons.id, seasonId));
}

export async function listClosedSeasons(divisionId: string) {
  return db.query.seasons.findMany({
    where: and(eq(seasons.divisionId, divisionId), eq(seasons.status, "closed")),
    orderBy: (s, { desc }) => [desc(s.startsAt)],
    limit: 5,
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
