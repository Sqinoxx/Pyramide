/**
 * Pure match-score validation and winner determination — PLAN.md §4.2
 * matchFormat (best of 3, 3rd set a match tiebreak). Deliberately has no DB
 * or "server-only" dependency (unlike src/server/challenges.ts, which uses
 * this) so it stays unit-testable without a database.
 */

export type SetScore = { gamesA: number; gamesB: number; tiebreakA?: number; tiebreakB?: number };

export class MatchFormatError extends Error {}

const MATCH_FORMAT_HINT =
  "Erwartet werden 2 oder 3 Sätze (Games 0-7, bei 6:6 Tiebreak; 3. Satz als Match-Tiebreak bis 10).";

function validSetWinner(set: SetScore, setIndex: number, totalSets: number): "a" | "b" {
  const { gamesA, gamesB, tiebreakA, tiebreakB } = set;
  const isMatchTiebreak = setIndex === 2 && totalSets === 3;

  if (isMatchTiebreak) {
    if (tiebreakA === undefined || tiebreakB === undefined) {
      throw new MatchFormatError(`3. Satz muss als Match-Tiebreak eingetragen werden. ${MATCH_FORMAT_HINT}`);
    }
    const higher = Math.max(tiebreakA, tiebreakB);
    const lower = Math.min(tiebreakA, tiebreakB);
    if (higher < 10 || higher - lower < 2) {
      throw new MatchFormatError(`Ungültiger Match-Tiebreak-Stand. ${MATCH_FORMAT_HINT}`);
    }
    return tiebreakA > tiebreakB ? "a" : "b";
  }

  const higher = Math.max(gamesA, gamesB);
  const lower = Math.min(gamesA, gamesB);
  const validNormal = higher === 6 && lower <= 4;
  const validExtended = higher === 7 && (lower === 5 || lower === 6);
  if (!validNormal && !validExtended) {
    throw new MatchFormatError(`Ungültiger Satzstand ${gamesA}:${gamesB}. ${MATCH_FORMAT_HINT}`);
  }
  if (higher === 7 && lower === 6 && (tiebreakA === undefined || tiebreakB === undefined)) {
    throw new MatchFormatError(`Ein 7:6-Satz braucht einen Tiebreak-Stand. ${MATCH_FORMAT_HINT}`);
  }
  return gamesA > gamesB ? "a" : "b";
}

/** Best-of-3, 3rd set a match tiebreak, validated set by set. */
export function determineWinnerFromSets(sets: SetScore[]): "a" | "b" {
  if (sets.length < 2 || sets.length > 3) {
    throw new MatchFormatError(`Ein Match hat 2 oder 3 Sätze. ${MATCH_FORMAT_HINT}`);
  }
  const winners = sets.map((s, i) => validSetWinner(s, i, sets.length));
  const aWins = winners.filter((w) => w === "a").length;
  const bWins = winners.filter((w) => w === "b").length;
  if (sets.length === 2 && aWins !== 2 && bWins !== 2) {
    throw new MatchFormatError(`Bei 2 gemeldeten Sätzen muss eine Seite beide gewonnen haben. ${MATCH_FORMAT_HINT}`);
  }
  if (aWins < 2 && bWins < 2) {
    throw new MatchFormatError(`Es steht noch kein Sieger fest. ${MATCH_FORMAT_HINT}`);
  }
  return aWins > bWins ? "a" : "b";
}
