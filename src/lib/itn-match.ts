/**
 * Name normalization used both when writing `normalized_name` on write (for
 * the pg_trgm index) and when scoring candidates in the ITN matching UI.
 * Kept pure / dependency-free so it can run identically in the DB migration
 * trigger-less approach (we normalize in application code on insert) and in
 * unit tests.
 */

const UMLAUT_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
};

export function normalizeName(lastName: string, firstName: string): string {
  const combine = (s: string) =>
    s
      .toLowerCase()
      .replace(/[äöüß]/g, (ch) => UMLAUT_MAP[ch] ?? ch)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // strip remaining diacritics
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  return `${combine(lastName)}, ${combine(firstName)}`;
}

export type ItnCandidate = {
  itnRecordId: string;
  lastName: string;
  firstName: string;
  birthYear: number | null;
  gender: "m" | "w" | "d" | null;
  club: string | null;
  similarity: number; // 0..1, from pg_trgm similarity()
};

export type MemberQuery = {
  lastName: string;
  firstName: string;
  birthYear: number | null;
  gender: "m" | "w" | "d";
  club: string | null;
};

export type ScoredCandidate = ItnCandidate & { score: number };

/**
 * Combine trigram name similarity with bonuses for matching birth year,
 * club, and gender. Never used to auto-assign silently — callers must still
 * route `auto`-tier results through an explicit user confirmation step.
 */
export function scoreCandidate(
  member: MemberQuery,
  candidate: ItnCandidate,
): ScoredCandidate {
  let score = candidate.similarity;
  if (member.birthYear !== null && candidate.birthYear === member.birthYear) {
    score += 0.06;
  }
  if (
    member.club &&
    candidate.club &&
    member.club.trim().toLowerCase() === candidate.club.trim().toLowerCase()
  ) {
    score += 0.04;
  }
  if (candidate.gender && candidate.gender === member.gender) {
    score += 0.02;
  }
  return { ...candidate, score: Math.min(score, 1) };
}

export type MatchTier = "auto" | "suggest" | "none";

const AUTO_THRESHOLD = 0.92;
const SUGGEST_THRESHOLD = 0.55;

/**
 * Classify a ranked candidate list. `auto` requires both a high score AND a
 * clear margin over the runner-up, so two very-similar names don't get
 * silently collapsed into one.
 */
export function classifyMatches(scored: ScoredCandidate[]): {
  tier: MatchTier;
  candidates: ScoredCandidate[];
} {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  if (sorted.length === 0) return { tier: "none", candidates: [] };
  const [best, runnerUp] = sorted;
  const clearMargin = !runnerUp || best.score - runnerUp.score >= 0.05;
  if (best.score >= AUTO_THRESHOLD && clearMargin) {
    return { tier: "auto", candidates: sorted };
  }
  const suggestions = sorted.filter((c) => c.score >= SUGGEST_THRESHOLD);
  if (suggestions.length > 0) return { tier: "suggest", candidates: suggestions };
  return { tier: "none", candidates: [] };
}
