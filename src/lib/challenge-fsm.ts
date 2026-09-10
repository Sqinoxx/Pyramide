/**
 * Pure state machine for a challenge's lifecycle (PLAN.md §4.4). All
 * transitions are computed here as data; the caller (src/server/challenges.ts)
 * is responsible for the DB transaction, timestamps, and side effects
 * (notifications, position swap). Keeping this pure makes every branch —
 * especially the walkover / expiry edge cases — cheap to unit test.
 */

export type ChallengeState =
  | "proposed"
  | "accepted"
  | "declined"
  | "reported"
  | "disputed"
  | "expired_accept"
  | "expired_play"
  | "cancelled"
  | "settled";

export type Resolution =
  | "played"
  | "walkover_challenger"
  | "walkover_defender"
  | "cancelled";

export type Event =
  | { type: "accept" }
  | { type: "decline"; validReason: boolean }
  | { type: "accept_deadline_passed" }
  | { type: "report"; winner: "challenger" | "defender" }
  | { type: "confirm" }
  | { type: "dispute" }
  | { type: "admin_resolve"; winner: "challenger" | "defender" }
  | { type: "admin_cancel" }
  | { type: "play_deadline_passed" }
  | { type: "report_confirm_deadline_passed" };

export type TransitionResult = {
  state: ChallengeState;
  resolution?: Resolution;
  /** Set when the transition determines a swap: who ends up "winning" the slot. */
  winner?: "challenger" | "defender";
};

export class InvalidTransitionError extends Error {
  constructor(from: ChallengeState, event: Event["type"]) {
    super(`Cannot apply event "${event}" to challenge in state "${from}"`);
    this.name = "InvalidTransitionError";
  }
}

export function transition(
  state: ChallengeState,
  event: Event,
): TransitionResult {
  switch (state) {
    case "proposed":
      if (event.type === "accept") return { state: "accepted" };
      if (event.type === "decline") {
        return event.validReason
          ? { state: "cancelled", resolution: "cancelled" }
          : {
              state: "settled",
              resolution: "walkover_challenger",
              winner: "challenger",
            };
      }
      if (event.type === "accept_deadline_passed") {
        return {
          state: "settled",
          resolution: "walkover_challenger",
          winner: "challenger",
        };
      }
      break;

    case "accepted":
      if (event.type === "report")
        return { state: "reported", winner: event.winner };
      if (event.type === "play_deadline_passed") {
        // Neither side reported a result in time — challenger keeps the
        // benefit of the doubt only if they can show they tried; by default
        // this is treated as a shared no-show and resolved by an admin.
        return { state: "expired_play" };
      }
      break;

    case "reported":
      if (event.type === "confirm") return { state: "settled" };
      if (event.type === "dispute") return { state: "disputed" };
      if (event.type === "report_confirm_deadline_passed") {
        return { state: "settled" }; // auto-confirm
      }
      break;

    case "disputed":
      if (event.type === "admin_resolve") {
        return { state: "settled", resolution: "played", winner: event.winner };
      }
      if (event.type === "admin_cancel") {
        return { state: "settled", resolution: "cancelled" };
      }
      break;

    case "expired_play":
      if (event.type === "admin_cancel") {
        return { state: "settled", resolution: "cancelled" };
      }
      if (event.type === "admin_resolve") {
        return {
          state: "settled",
          resolution:
            event.winner === "challenger"
              ? "walkover_challenger"
              : "walkover_defender",
          winner: event.winner,
        };
      }
      break;

    default:
      break;
  }
  throw new InvalidTransitionError(state, event.type);
}

export const TERMINAL_STATES: ReadonlySet<ChallengeState> = new Set([
  "settled",
  "declined",
  "cancelled",
]);

export function isTerminal(state: ChallengeState): boolean {
  return TERMINAL_STATES.has(state);
}
