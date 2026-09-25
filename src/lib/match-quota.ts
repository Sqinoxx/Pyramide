import { addYears, subDays } from "date-fns";

/**
 * Mindestanzahl an Spielen pro Jahr: pure evaluation, no I/O.
 *
 * Years are counted from the member's entry into the pyramid (`anchor`), not
 * the calendar year, so someone who joins in November isn't measured
 * against a year they were barely part of. Missing the quota never kicks
 * anyone automatically — "overdue" only flags the member for the admin, who
 * removes them by hand (src/server/seasons.ts removeMemberFromPyramid).
 */
export type MatchQuotaState = "ok" | "warning" | "overdue";

export type MatchQuotaStatus = {
  state: MatchQuotaState;
  /** Matches counted in the evaluated period. */
  played: number;
  required: number;
  /** End of the evaluated period — in the future for "warning", already passed for "overdue". */
  deadline: Date;
};

export function evaluateMatchQuota(input: {
  anchor: Date;
  now: Date;
  matchDates: Date[];
  required: number;
  warningDays: number;
}): MatchQuotaStatus | null {
  const { anchor, now, matchDates, required, warningDays } = input;
  if (required <= 0 || now < anchor) return null;

  let years = 0;
  while (addYears(anchor, years + 1) <= now) years += 1;

  const countBetween = (from: Date, to: Date) =>
    matchDates.filter((d) => d >= from && d < to).length;

  const periodStart = addYears(anchor, years);
  const periodEnd = addYears(anchor, years + 1);

  // A finished year that fell short stays flagged until the admin acts —
  // the hourglass keeps showing after the deadline, not just before it.
  if (years >= 1) {
    const previousStart = addYears(anchor, years - 1);
    const previousPlayed = countBetween(previousStart, periodStart);
    if (previousPlayed < required) {
      return { state: "overdue", played: previousPlayed, required, deadline: periodStart };
    }
  }

  const played = countBetween(periodStart, periodEnd);
  const state: MatchQuotaState =
    played < required && now >= subDays(periodEnd, warningDays) ? "warning" : "ok";
  return { state, played, required, deadline: periodEnd };
}
