import { describe, it, expect } from "vitest";
import { determineWinnerFromSets, MatchFormatError, type SetScore } from "./match-result";

describe("determineWinnerFromSets", () => {
  it("declares a straight-sets winner", () => {
    const sets: SetScore[] = [
      { gamesA: 6, gamesB: 3 },
      { gamesA: 6, gamesB: 4 },
    ];
    expect(determineWinnerFromSets(sets)).toBe("a");
  });

  it("declares the other side the winner", () => {
    const sets: SetScore[] = [
      { gamesA: 4, gamesB: 6 },
      { gamesA: 2, gamesB: 6 },
    ];
    expect(determineWinnerFromSets(sets)).toBe("b");
  });

  it("accepts a 7:5 set", () => {
    const sets: SetScore[] = [
      { gamesA: 7, gamesB: 5 },
      { gamesA: 6, gamesB: 2 },
    ];
    expect(determineWinnerFromSets(sets)).toBe("a");
  });

  it("accepts a 7:6 set with a tiebreak score", () => {
    const sets: SetScore[] = [
      { gamesA: 7, gamesB: 6, tiebreakA: 7, tiebreakB: 3 },
      { gamesA: 6, gamesB: 2 },
    ];
    expect(determineWinnerFromSets(sets)).toBe("a");
  });

  it("rejects a 7:6 set without a tiebreak score", () => {
    const sets: SetScore[] = [
      { gamesA: 7, gamesB: 6 },
      { gamesA: 6, gamesB: 2 },
    ];
    expect(() => determineWinnerFromSets(sets)).toThrow(MatchFormatError);
  });

  it("resolves a 3-set match decided by a match tiebreak", () => {
    const sets: SetScore[] = [
      { gamesA: 6, gamesB: 3 },
      { gamesA: 4, gamesB: 6 },
      { gamesA: 0, gamesB: 0, tiebreakA: 10, tiebreakB: 7 },
    ];
    expect(determineWinnerFromSets(sets)).toBe("a");
  });

  it("rejects a match tiebreak decided by less than a 2-point margin", () => {
    const sets: SetScore[] = [
      { gamesA: 6, gamesB: 3 },
      { gamesA: 4, gamesB: 6 },
      { gamesA: 0, gamesB: 0, tiebreakA: 10, tiebreakB: 9 },
    ];
    expect(() => determineWinnerFromSets(sets)).toThrow(MatchFormatError);
  });

  it("rejects an implausible game score", () => {
    const sets: SetScore[] = [
      { gamesA: 8, gamesB: 3 },
      { gamesA: 6, gamesB: 2 },
    ];
    expect(() => determineWinnerFromSets(sets)).toThrow(MatchFormatError);
  });

  it("rejects a single reported set", () => {
    expect(() => determineWinnerFromSets([{ gamesA: 6, gamesB: 2 }])).toThrow(MatchFormatError);
  });

  it("rejects more than 3 sets", () => {
    const sets: SetScore[] = [
      { gamesA: 6, gamesB: 2 },
      { gamesA: 2, gamesB: 6 },
      { gamesA: 6, gamesB: 2 },
      { gamesA: 6, gamesB: 2 },
    ];
    expect(() => determineWinnerFromSets(sets)).toThrow(MatchFormatError);
  });

  it("rejects 2 sets split between both sides (no clear winner)", () => {
    const sets: SetScore[] = [
      { gamesA: 6, gamesB: 2 },
      { gamesA: 2, gamesB: 6 },
    ];
    expect(() => determineWinnerFromSets(sets)).toThrow(MatchFormatError);
  });

  it("rejects a 3rd set that isn't a match tiebreak format", () => {
    const sets: SetScore[] = [
      { gamesA: 6, gamesB: 3 },
      { gamesA: 4, gamesB: 6 },
      { gamesA: 6, gamesB: 4 },
    ];
    expect(() => determineWinnerFromSets(sets)).toThrow(MatchFormatError);
  });
});
