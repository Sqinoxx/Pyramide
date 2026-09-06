/**
 * Pure pyramid geometry helpers — no I/O, fully unit-testable.
 *
 * Row r (1-indexed, 1 = top) holds exactly r slots (1-indexed, 1 = leftmost /
 * best). This module only knows about (row, slot) coordinates; persistence
 * and locking live in src/server/pyramid-repo.ts.
 */

export type Position = { row: number; slot: number };

/** Total number of slots across rows 1..row (triangular number). */
export function slotsUpToRow(row: number): number {
  return (row * (row + 1)) / 2;
}

/** How many rows are needed to hold `count` members. */
export function rowsForCount(count: number): number {
  let row = 0;
  let total = 0;
  while (total < count) {
    row += 1;
    total += row;
  }
  return row;
}

/** Ordinal rank (1-based, reading each row left to right) of a position. */
export function rankOf(pos: Position): number {
  return slotsUpToRow(pos.row - 1) + pos.slot;
}

/** Inverse of rankOf: turn a 1-based rank into (row, slot). */
export function positionOfRank(rank: number): Position {
  let row = 1;
  while (slotsUpToRow(row) < rank) row += 1;
  const slot = rank - slotsUpToRow(row - 1);
  return { row, slot };
}

/** The next free position when appending to a pyramid that already seats `occupiedCount`. */
export function nextOpenPosition(occupiedCount: number): Position {
  return positionOfRank(occupiedCount + 1);
}

export type ChallengeRules = {
  /** How many rows above the challenger's own row may be challenged. */
  challengeRowRange: number;
  /** Whether a same-row challenge (strictly better slot) is allowed. */
  challengeSameRow: boolean;
};

/**
 * Whether `challenger` is allowed to challenge `defender` on pure geometry
 * grounds (row range). Does not check cooldowns, open-challenge limits, or
 * member status — those are stateful and live in the challenge service.
 */
export function isEligibleChallenge(
  challenger: Position,
  defender: Position,
  rules: ChallengeRules,
): boolean {
  if (defender.row === challenger.row) {
    return rules.challengeSameRow && defender.slot < challenger.slot;
  }
  if (defender.row >= challenger.row) return false;
  const rowGap = challenger.row - defender.row;
  return rowGap <= rules.challengeRowRange;
}

/** Result of a challenge: swap the two positions. Returns the two new assignments. */
export function swapPositions(
  a: { memberId: string; position: Position },
  b: { memberId: string; position: Position },
): [{ memberId: string; position: Position }, { memberId: string; position: Position }] {
  return [
    { memberId: a.memberId, position: b.position },
    { memberId: b.memberId, position: a.position },
  ];
}

export type SeedEntry = {
  memberId: string;
  /** Lower is stronger (ITN 1.0 = best). Members without an ITN sort last. */
  itn: number | null;
  /** Tiebreak for equal/absent ITN — e.g. an admin-assigned rank, then random. */
  tiebreak: number;
};

/** Deterministic seed order -> (row, slot) assignment for a fresh season. */
export function seedPyramid(entries: SeedEntry[]): Map<string, Position> {
  const sorted = [...entries].sort((a, b) => {
    if (a.itn === null && b.itn === null) return a.tiebreak - b.tiebreak;
    if (a.itn === null) return 1;
    if (b.itn === null) return -1;
    if (a.itn !== b.itn) return a.itn - b.itn;
    return a.tiebreak - b.tiebreak;
  });
  const result = new Map<string, Position>();
  sorted.forEach((entry, i) => {
    result.set(entry.memberId, positionOfRank(i + 1));
  });
  return result;
}
