import "server-only";
import { and, eq, inArray, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { challenges, matches, matchSets, members, positions, seasons } from "@/db/schema";
import { isEligibleChallenge, type Position } from "@/lib/pyramid";
import {
  transition,
  InvalidTransitionError,
  type ChallengeState,
  type Event as ChallengeEvent,
} from "@/lib/challenge-fsm";
import { divisionSettingsSchema, type DivisionSettings } from "@/lib/settings";
import { determineWinnerFromSets, type SetScore } from "@/lib/match-result";
import {
  notifyChallengeAccepted,
  notifyChallengeDeclined,
  notifyChallengeReceived,
  notifyPositionChange,
  notifyResultConfirmed,
  notifyResultReported,
  notifyWalkover,
} from "./notifications";
import { swapMemberPositions } from "./position-swap";
import type { Tx } from "./db-types";

const OPEN_STATES: ChallengeState[] = [
  "proposed",
  "accepted",
  "reported",
  "disputed",
  "expired_accept",
  "expired_play",
];

export class ChallengeError extends Error {}

/**
 * Thin wrapper around the pure transition() so every public function here
 * only ever throws ChallengeError — callers (the server actions) then have
 * one error type to catch instead of also needing to know about
 * InvalidTransitionError from the FSM module.
 */
function safeTransition(state: ChallengeState, event: ChallengeEvent) {
  try {
    return transition(state, event);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      throw new ChallengeError("Diese Aktion ist in diesem Status nicht mehr möglich.");
    }
    throw err;
  }
}

async function getSeasonSettings(seasonId: string): Promise<DivisionSettings> {
  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) throw new ChallengeError("Season not found");
  return divisionSettingsSchema.parse(season.settings ?? {});
}

async function getPosition(seasonId: string, memberId: string): Promise<Position | null> {
  const pos = await db.query.positions.findFirst({
    where: and(eq(positions.seasonId, seasonId), eq(positions.memberId, memberId)),
  });
  return pos ? { row: pos.row, slot: pos.slot } : null;
}

/**
 * Members the given member is currently allowed to challenge: geometry
 * (PLAN.md §4.2) plus the stateful checks (status, open challenges,
 * cooldowns). Used both to render the "fordern" UI and re-checked in full
 * by createChallenge() — never trust a list rendered a few seconds ago.
 */
export async function getEligibleDefenders(seasonId: string, challengerId: string) {
  const settings = await getSeasonSettings(seasonId);
  const challengerPos = await getPosition(seasonId, challengerId);
  if (!challengerPos) return [];

  const challenger = await db.query.members.findFirst({ where: eq(members.id, challengerId) });
  if (challenger?.onLeaveUntil && challenger.onLeaveUntil > new Date()) return [];

  const rows = await db
    .select({ position: positions, member: members })
    .from(positions)
    .innerJoin(members, eq(positions.memberId, members.id))
    .where(eq(positions.seasonId, seasonId));

  const now = new Date();
  const eligible: { memberId: string; firstName: string; lastName: string; row: number; slot: number }[] = [];

  for (const { position, member } of rows) {
    if (member.id === challengerId) continue;
    if (member.status !== "active") continue;
    if (member.onLeaveUntil && member.onLeaveUntil > now) continue;
    if (!isEligibleChallenge(challengerPos, { row: position.row, slot: position.slot }, settings)) continue;

    if (await hasOpenChallenge(seasonId, member.id)) continue;
    if (await isInCooldown(seasonId, challengerId, member.id, settings)) continue;

    eligible.push({
      memberId: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      row: position.row,
      slot: position.slot,
    });
  }

  return eligible;
}

async function hasOpenChallenge(seasonId: string, memberId: string): Promise<boolean> {
  const existing = await db.query.challenges.findFirst({
    where: and(
      eq(challenges.seasonId, seasonId),
      or(eq(challenges.challengerId, memberId), eq(challenges.defenderId, memberId)),
      inArray(challenges.state, OPEN_STATES),
    ),
  });
  return !!existing;
}

async function isInCooldown(
  seasonId: string,
  memberAId: string,
  memberBId: string,
  settings: DivisionSettings,
): Promise<boolean> {
  const lastBetweenThem = await db.query.challenges.findFirst({
    where: and(
      eq(challenges.seasonId, seasonId),
      or(
        and(eq(challenges.challengerId, memberAId), eq(challenges.defenderId, memberBId)),
        and(eq(challenges.challengerId, memberBId), eq(challenges.defenderId, memberAId)),
      ),
      eq(challenges.state, "settled"),
    ),
    orderBy: (c, { desc }) => [desc(c.resolvedAt)],
  });
  if (lastBetweenThem?.resolvedAt) {
    const cooldownEnd = addDays(lastBetweenThem.resolvedAt, settings.rematchCooldownDays);
    if (cooldownEnd > new Date()) return true;
  }

  const lastForEither = await db.query.challenges.findFirst({
    where: and(
      eq(challenges.seasonId, seasonId),
      or(
        eq(challenges.challengerId, memberAId),
        eq(challenges.defenderId, memberAId),
        eq(challenges.challengerId, memberBId),
        eq(challenges.defenderId, memberBId),
      ),
      eq(challenges.state, "settled"),
    ),
    orderBy: (c, { desc }) => [desc(c.resolvedAt)],
  });
  if (lastForEither?.resolvedAt) {
    const cooldownEnd = addDays(lastForEither.resolvedAt, settings.postMatchCooldownDays);
    if (cooldownEnd > new Date()) return true;
  }

  return false;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function createChallenge(seasonId: string, challengerId: string, defenderId: string) {
  if (challengerId === defenderId) throw new ChallengeError("Man kann sich nicht selbst fordern.");

  const settings = await getSeasonSettings(seasonId);
  const [challengerPos, defenderPos] = await Promise.all([
    getPosition(seasonId, challengerId),
    getPosition(seasonId, defenderId),
  ]);
  if (!challengerPos || !defenderPos) {
    throw new ChallengeError("Position nicht gefunden.");
  }
  if (!isEligibleChallenge(challengerPos, defenderPos, settings)) {
    throw new ChallengeError("Diese Forderung ist nach den Pyramidenregeln nicht erlaubt.");
  }
  const [challengerMember, defenderMember] = await Promise.all([
    db.query.members.findFirst({ where: eq(members.id, challengerId) }),
    db.query.members.findFirst({ where: eq(members.id, defenderId) }),
  ]);
  const now = new Date();
  if (challengerMember?.onLeaveUntil && challengerMember.onLeaveUntil > now) {
    throw new ChallengeError("Du bist im Urlaubsmodus und kannst aktuell nicht fordern.");
  }
  if (defenderMember?.onLeaveUntil && defenderMember.onLeaveUntil > now) {
    throw new ChallengeError("Diese Person ist im Urlaubsmodus und kann aktuell nicht gefordert werden.");
  }
  if (await hasOpenChallenge(seasonId, challengerId)) {
    throw new ChallengeError("Du hast bereits eine offene Forderung.");
  }
  if (await hasOpenChallenge(seasonId, defenderId)) {
    throw new ChallengeError("Diese Person hat bereits eine offene Forderung.");
  }
  if (await isInCooldown(seasonId, challengerId, defenderId, settings)) {
    throw new ChallengeError("Diese Paarung ist aktuell in der Sperrfrist.");
  }

  try {
    const [challenge] = await db
      .insert(challenges)
      .values({
        seasonId,
        challengerId,
        defenderId,
        state: "proposed",
        proposedAt: now,
        acceptDeadline: addDays(now, settings.acceptDeadlineDays),
      })
      .returning();

    const challenger = await db.query.members.findFirst({ where: eq(members.id, challengerId) });
    if (challenger) {
      await notifyChallengeReceived(defenderId, `${challenger.firstName} ${challenger.lastName}`);
    }

    return challenge;
  } catch (err) {
    // Backstop for the race between the hasOpenChallenge() checks above and
    // this insert: drizzle/0001_partial_indexes.sql enforces "at most one
    // open challenge per member" at the database level too, so a concurrent
    // request landing in that gap fails here instead of corrupting state.
    if (isUniqueViolation(err)) {
      throw new ChallengeError(
        "Du oder die geforderte Person haben inzwischen bereits eine offene Forderung.",
      );
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

async function requireChallenge(challengeId: string) {
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
    with: { challenger: true, defender: true },
  });
  if (!challenge) throw new ChallengeError("Forderung nicht gefunden.");
  return challenge;
}

function requireParticipant(challenge: { challengerId: string; defenderId: string }, memberId: string) {
  if (memberId !== challenge.challengerId && memberId !== challenge.defenderId) {
    throw new ChallengeError("Du bist an dieser Forderung nicht beteiligt.");
  }
}

export async function acceptChallenge(challengeId: string, memberId: string) {
  const challenge = await requireChallenge(challengeId);
  if (memberId !== challenge.defenderId) {
    throw new ChallengeError("Nur die geforderte Person kann annehmen.");
  }
  const settings = await getSeasonSettings(challenge.seasonId);
  const result = safeTransition(challenge.state as ChallengeState, { type: "accept" });

  const now = new Date();
  await db
    .update(challenges)
    .set({
      state: result.state,
      acceptedAt: now,
      playDeadline: addDays(now, settings.playDeadlineDays),
    })
    .where(eq(challenges.id, challengeId));

  await notifyChallengeAccepted(
    challenge.challengerId,
    `${challenge.defender.firstName} ${challenge.defender.lastName}`,
  );
}

export async function declineChallenge(challengeId: string, memberId: string, reason: string) {
  const challenge = await requireChallenge(challengeId);
  if (memberId !== challenge.defenderId) {
    throw new ChallengeError("Nur die geforderte Person kann ablehnen.");
  }
  const settings = await getSeasonSettings(challenge.seasonId);
  const validReason = !settings.declineForfeit;
  const result = safeTransition(challenge.state as ChallengeState, { type: "decline", validReason });

  await db.transaction(async (tx) => {
    await tx
      .update(challenges)
      .set({
        state: result.state,
        resolution: result.resolution,
        declineReason: reason || null,
        resolvedAt: new Date(),
      })
      .where(eq(challenges.id, challengeId));

    if (result.winner) {
      await settlePosition(tx, challenge.seasonId, challengeId, challenge.challengerId, challenge.defenderId, result.winner);
    }
  });

  await notifyChallengeDeclined(
    challenge.challengerId,
    `${challenge.defender.firstName} ${challenge.defender.lastName}`,
    reason || null,
  );
  if (result.winner === "challenger") {
    await notifyWalkover(
      challenge.challengerId,
      true,
      `${challenge.defender.firstName} ${challenge.defender.lastName}`,
    );
    await notifyWalkover(
      challenge.defenderId,
      false,
      `${challenge.challenger.firstName} ${challenge.challenger.lastName}`,
    );
    await notifyPositionChange(challenge.challengerId, "up", "Forderung gewonnen (Walkover)");
    await notifyPositionChange(challenge.defenderId, "down", "Forderung verloren (Walkover)");
  }
}

export async function reportResult(
  challengeId: string,
  reportedByMemberId: string,
  sets: SetScore[],
) {
  const challenge = await requireChallenge(challengeId);
  requireParticipant(challenge, reportedByMemberId);

  const winnerSide = determineWinnerFromSets(sets);
  const winnerId = winnerSide === "a" ? challenge.challengerId : challenge.defenderId;
  const winnerRole = winnerId === challenge.challengerId ? "challenger" : "defender";
  const result = safeTransition(challenge.state as ChallengeState, { type: "report", winner: winnerRole });

  await db.transaction(async (tx) => {
    const [match] = await tx
      .insert(matches)
      .values({
        challengeId,
        playedAt: new Date(),
        winnerId,
        reportedBy: reportedByMemberId,
      })
      .returning();

    await tx.insert(matchSets).values(
      sets.map((s, i) => ({
        matchId: match.id,
        setNo: i + 1,
        gamesA: s.gamesA,
        gamesB: s.gamesB,
        tiebreakA: s.tiebreakA ?? null,
        tiebreakB: s.tiebreakB ?? null,
      })),
    );

    await tx.update(challenges).set({ state: result.state }).where(eq(challenges.id, challengeId));
  });

  const recipientId = reportedByMemberId === challenge.challengerId ? challenge.defenderId : challenge.challengerId;
  const reporter = reportedByMemberId === challenge.challengerId ? challenge.challenger : challenge.defender;
  await notifyResultReported(recipientId, `${reporter.firstName} ${reporter.lastName}`);
}

export async function confirmResult(challengeId: string, confirmingMemberId: string) {
  const challenge = await requireChallenge(challengeId);
  requireParticipant(challenge, confirmingMemberId);

  const match = await db.query.matches.findFirst({ where: eq(matches.challengeId, challengeId) });
  if (!match) throw new ChallengeError("Kein Ergebnis zum Bestätigen gefunden.");
  if (match.reportedBy === confirmingMemberId) {
    throw new ChallengeError("Das gemeldete Ergebnis muss von der Gegenseite bestätigt werden.");
  }

  const result = safeTransition(challenge.state as ChallengeState, { type: "confirm" });
  const winnerRole = match.winnerId === challenge.challengerId ? "challenger" : "defender";

  await db.transaction(async (tx) => {
    await tx
      .update(matches)
      .set({ confirmedBy: confirmingMemberId, confirmedAt: new Date() })
      .where(eq(matches.id, match.id));

    await tx
      .update(challenges)
      .set({ state: result.state, resolution: "played", resolvedAt: new Date() })
      .where(eq(challenges.id, challengeId));

    await settlePosition(tx, challenge.seasonId, challengeId, challenge.challengerId, challenge.defenderId, winnerRole);
  });

  await notifyResultConfirmed(match.reportedBy!, false);
  if (winnerRole === "challenger") {
    await notifyPositionChange(challenge.challengerId, "up", "Forderung gewonnen");
    await notifyPositionChange(challenge.defenderId, "down", "Forderung verloren");
  }
}

export async function disputeResult(challengeId: string, memberId: string) {
  const challenge = await requireChallenge(challengeId);
  requireParticipant(challenge, memberId);
  const result = safeTransition(challenge.state as ChallengeState, { type: "dispute" });
  await db.update(challenges).set({ state: result.state }).where(eq(challenges.id, challengeId));
}

/** Admin arbitration for a disputed or expired-play challenge. `winnerId: null` cancels without a swap. */
export async function adminResolveChallenge(challengeId: string, winnerId: string | null) {
  const challenge = await requireChallenge(challengeId);
  const state = challenge.state as ChallengeState;

  if (!winnerId) {
    const result = safeTransition(state, { type: "admin_cancel" });
    await db
      .update(challenges)
      .set({ state: result.state, resolution: result.resolution, resolvedAt: new Date() })
      .where(eq(challenges.id, challengeId));
    return;
  }

  requireParticipant(challenge, winnerId);
  const winnerRole = winnerId === challenge.challengerId ? "challenger" : "defender";
  const result = safeTransition(state, { type: "admin_resolve", winner: winnerRole });

  await db.transaction(async (tx) => {
    await tx
      .update(challenges)
      .set({ state: result.state, resolution: result.resolution, resolvedAt: new Date() })
      .where(eq(challenges.id, challengeId));

    await settlePosition(tx, challenge.seasonId, challengeId, challenge.challengerId, challenge.defenderId, winnerRole);
  });

  // "disputed" -> admin_resolve means a match *was* played but was contested
  // (resolution "played"); "expired_play" -> admin_resolve means nobody
  // showed up by the deadline (a genuine walkover) — only the latter should
  // say "Nichtantreten" to the players.
  const loserId = winnerRole === "challenger" ? challenge.defenderId : challenge.challengerId;
  const winnerName =
    winnerRole === "challenger"
      ? `${challenge.challenger.firstName} ${challenge.challenger.lastName}`
      : `${challenge.defender.firstName} ${challenge.defender.lastName}`;
  const loserName =
    winnerRole === "challenger"
      ? `${challenge.defender.firstName} ${challenge.defender.lastName}`
      : `${challenge.challenger.firstName} ${challenge.challenger.lastName}`;

  if (result.resolution === "played") {
    await notifyResultConfirmed(winnerId, false);
  } else {
    await notifyWalkover(winnerId, true, loserName);
    await notifyWalkover(loserId, false, winnerName);
  }

  if (winnerRole === "challenger") {
    await notifyPositionChange(challenge.challengerId, "up", "Admin-Entscheidung");
    await notifyPositionChange(challenge.defenderId, "down", "Admin-Entscheidung");
  }
}

/**
 * Applies the position swap for a settled challenge (PLAN.md §4.3): only
 * the challenger winning moves anyone — a defender win, by design, changes
 * nothing but starts both players' cooldowns. The actual swap mechanics
 * (and why they need a 3-step shuffle) live in src/server/position-swap.ts,
 * shared with the inactivity-demotion and admin-correction call sites.
 */
async function settlePosition(
  tx: Tx,
  seasonId: string,
  challengeId: string,
  challengerId: string,
  defenderId: string,
  winnerRole: "challenger" | "defender",
) {
  if (winnerRole !== "challenger") return;

  const result = await swapMemberPositions(
    tx,
    seasonId,
    { memberId: challengerId, reason: "challenge_win", challengeId },
    { memberId: defenderId, reason: "swap_loss", challengeId },
  );
  if (!result) throw new ChallengeError("Position nicht gefunden.");
}

/* -------------------------------------------------------------------------- */
/*  Deadline jobs (PLAN.md §8) — called by src/worker, one challenge at a     */
/*  time so a single failure doesn't block the rest of the batch.            */
/* -------------------------------------------------------------------------- */

export async function findExpiredAcceptChallenges(): Promise<string[]> {
  const rows = await db.query.challenges.findMany({
    where: and(eq(challenges.state, "proposed"), lt(challenges.acceptDeadline, new Date())),
  });
  return rows.map((r) => r.id);
}

export async function findExpiredPlayChallenges(): Promise<string[]> {
  const rows = await db.query.challenges.findMany({
    where: and(eq(challenges.state, "accepted"), lt(challenges.playDeadline, new Date())),
  });
  return rows.map((r) => r.id);
}

export async function findUnconfirmedReports(): Promise<string[]> {
  const rows = await db
    .select({ challenge: challenges, match: matches })
    .from(challenges)
    .innerJoin(matches, eq(matches.challengeId, challenges.id))
    .where(eq(challenges.state, "reported"));

  const overdue: string[] = [];
  for (const { challenge, match } of rows) {
    const settings = await getSeasonSettings(challenge.seasonId);
    if (addDays(match.createdAt, settings.reportConfirmDays) < new Date()) {
      overdue.push(challenge.id);
    }
  }
  return overdue;
}

/** Nobody accepted in time — the challenger wins by default (PLAN.md §8.1). */
export async function expireAcceptDeadline(challengeId: string) {
  const challenge = await requireChallenge(challengeId);
  if (challenge.state !== "proposed") return; // already handled by a concurrent run

  const result = safeTransition(challenge.state as ChallengeState, { type: "accept_deadline_passed" });

  await db.transaction(async (tx) => {
    await tx
      .update(challenges)
      .set({ state: result.state, resolution: result.resolution, resolvedAt: new Date() })
      .where(eq(challenges.id, challengeId));
    if (result.winner) {
      await settlePosition(tx, challenge.seasonId, challengeId, challenge.challengerId, challenge.defenderId, result.winner);
    }
  });

  await notifyWalkover(
    challenge.challengerId,
    true,
    `${challenge.defender.firstName} ${challenge.defender.lastName}`,
  );
  await notifyWalkover(
    challenge.defenderId,
    false,
    `${challenge.challenger.firstName} ${challenge.challenger.lastName}`,
  );
  await notifyPositionChange(challenge.challengerId, "up", "Forderung nicht rechtzeitig angenommen");
  await notifyPositionChange(challenge.defenderId, "down", "Forderung nicht rechtzeitig angenommen");
}

/**
 * Nobody reported a result in time. Unlike a missed accept-deadline, fault
 * here isn't clear from the data alone (could be either side dodging, or
 * neither), so this only flags the challenge for admin triage
 * (/admin/forderungen) rather than declaring a winner automatically.
 */
export async function expirePlayDeadline(challengeId: string) {
  const challenge = await requireChallenge(challengeId);
  if (challenge.state !== "accepted") return;

  const result = safeTransition(challenge.state as ChallengeState, { type: "play_deadline_passed" });
  await db.update(challenges).set({ state: result.state }).where(eq(challenges.id, challengeId));
}

/** Confirmation window elapsed without a dispute — the reported result stands. */
export async function autoConfirmResult(challengeId: string) {
  const challenge = await requireChallenge(challengeId);
  if (challenge.state !== "reported") return;

  const match = await db.query.matches.findFirst({ where: eq(matches.challengeId, challengeId) });
  if (!match) return;

  const result = safeTransition(challenge.state as ChallengeState, {
    type: "report_confirm_deadline_passed",
  });
  const winnerRole = match.winnerId === challenge.challengerId ? "challenger" : "defender";

  await db.transaction(async (tx) => {
    await tx
      .update(challenges)
      .set({ state: result.state, resolution: "played", resolvedAt: new Date() })
      .where(eq(challenges.id, challengeId));
    await settlePosition(tx, challenge.seasonId, challengeId, challenge.challengerId, challenge.defenderId, winnerRole);
  });

  await notifyResultConfirmed(match.reportedBy!, true);
  if (winnerRole === "challenger") {
    await notifyPositionChange(challenge.challengerId, "up", "Ergebnis automatisch bestätigt");
    await notifyPositionChange(challenge.defenderId, "down", "Ergebnis automatisch bestätigt");
  }
}

/** Recent settled results for the public feed (PLAN.md v1 "Ergebnis-Feed") — excludes admin-cancelled challenges, which have no winner to show. */
export async function listRecentResults(seasonId: string, limit = 30) {
  return db.query.challenges.findMany({
    where: and(
      eq(challenges.seasonId, seasonId),
      eq(challenges.state, "settled"),
      ne(challenges.resolution, "cancelled"),
    ),
    orderBy: (c, { desc }) => [desc(c.resolvedAt)],
    limit,
    with: { challenger: true, defender: true, match: { with: { sets: true } } },
  });
}

export async function listChallengesForMember(seasonId: string, memberId: string) {
  return db.query.challenges.findMany({
    where: and(
      eq(challenges.seasonId, seasonId),
      or(eq(challenges.challengerId, memberId), eq(challenges.defenderId, memberId)),
    ),
    orderBy: (c, { desc }) => [desc(c.proposedAt)],
    with: { challenger: true, defender: true, match: { with: { sets: true } } },
  });
}

/** For the admin arbitration queue (/admin/forderungen). */
/** Disputed results and matches nobody reported by the play deadline — both need an admin to pick a winner (or cancel). */
export async function listChallengesNeedingAdminAttention() {
  return db.query.challenges.findMany({
    where: inArray(challenges.state, ["disputed", "expired_play"]),
    orderBy: (c, { asc }) => [asc(c.proposedAt)],
    with: {
      challenger: true,
      defender: true,
      match: { with: { sets: true } },
      season: { with: { division: true } },
    },
  });
}
