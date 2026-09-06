import { describe, it, expect } from "vitest";
import { transition, InvalidTransitionError, isTerminal } from "./challenge-fsm";

describe("challenge state machine", () => {
  it("happy path: proposed -> accepted -> reported -> settled", () => {
    expect(transition("proposed", { type: "accept" })).toEqual({ state: "accepted" });
    expect(
      transition("accepted", { type: "report", winner: "challenger" }),
    ).toEqual({ state: "reported", winner: "challenger" });
    expect(transition("reported", { type: "confirm" })).toEqual({ state: "settled" });
  });

  it("auto-confirms an unconfirmed result after the deadline", () => {
    expect(
      transition("reported", { type: "report_confirm_deadline_passed" }),
    ).toEqual({ state: "settled" });
  });

  it("disputed results are resolved by an admin", () => {
    expect(transition("reported", { type: "dispute" })).toEqual({ state: "disputed" });
    expect(
      transition("disputed", { type: "admin_resolve", winner: "defender" }),
    ).toEqual({ state: "settled", resolution: "played", winner: "defender" });
  });

  it("an unexcused decline is a walkover for the challenger", () => {
    expect(
      transition("proposed", { type: "decline", validReason: false }),
    ).toEqual({ state: "settled", resolution: "walkover_challenger", winner: "challenger" });
  });

  it("a decline with a valid reason just cancels the challenge", () => {
    expect(
      transition("proposed", { type: "decline", validReason: true }),
    ).toEqual({ state: "cancelled", resolution: "cancelled" });
  });

  it("missing the acceptance deadline is a walkover for the challenger", () => {
    expect(transition("proposed", { type: "accept_deadline_passed" })).toEqual({
      state: "settled",
      resolution: "walkover_challenger",
      winner: "challenger",
    });
  });

  it("missing the play deadline goes to expired_play for admin triage", () => {
    expect(transition("accepted", { type: "play_deadline_passed" })).toEqual({
      state: "expired_play",
    });
    expect(
      transition("expired_play", { type: "admin_resolve", winner: "defender" }),
    ).toEqual({
      state: "settled",
      resolution: "walkover_defender",
      winner: "defender",
    });
  });

  it("rejects events that don't apply to the current state", () => {
    expect(() => transition("proposed", { type: "confirm" })).toThrow(
      InvalidTransitionError,
    );
    expect(() => transition("settled", { type: "accept" })).toThrow(
      InvalidTransitionError,
    );
  });

  it("classifies terminal states", () => {
    expect(isTerminal("settled")).toBe(true);
    expect(isTerminal("declined")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("proposed")).toBe(false);
    expect(isTerminal("accepted")).toBe(false);
  });
});
