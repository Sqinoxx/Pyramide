import { describe, it, expect } from "vitest";
import {
  slotsUpToRow,
  rowsForCount,
  rankOf,
  positionOfRank,
  nextOpenPosition,
  isEligibleChallenge,
  swapPositions,
  seedPyramid,
  insertionRankByItn,
} from "./pyramid";

describe("slotsUpToRow", () => {
  it("computes triangular numbers", () => {
    expect(slotsUpToRow(0)).toBe(0);
    expect(slotsUpToRow(1)).toBe(1);
    expect(slotsUpToRow(2)).toBe(3);
    expect(slotsUpToRow(3)).toBe(6);
    expect(slotsUpToRow(5)).toBe(15);
  });
});

describe("rowsForCount", () => {
  it("finds the minimal row count to seat everyone", () => {
    expect(rowsForCount(0)).toBe(0);
    expect(rowsForCount(1)).toBe(1);
    expect(rowsForCount(3)).toBe(2);
    expect(rowsForCount(4)).toBe(3);
    expect(rowsForCount(6)).toBe(3);
    expect(rowsForCount(7)).toBe(4);
  });
});

describe("rankOf / positionOfRank", () => {
  it("round-trips rank <-> position", () => {
    for (let rank = 1; rank <= 30; rank++) {
      const pos = positionOfRank(rank);
      expect(rankOf(pos)).toBe(rank);
    }
  });

  it("orders rows left-to-right, top-to-bottom", () => {
    expect(positionOfRank(1)).toEqual({ row: 1, slot: 1 });
    expect(positionOfRank(2)).toEqual({ row: 2, slot: 1 });
    expect(positionOfRank(3)).toEqual({ row: 2, slot: 2 });
    expect(positionOfRank(4)).toEqual({ row: 3, slot: 1 });
    expect(positionOfRank(6)).toEqual({ row: 3, slot: 3 });
  });
});

describe("nextOpenPosition", () => {
  it("appends after the last occupied rank", () => {
    expect(nextOpenPosition(0)).toEqual({ row: 1, slot: 1 });
    expect(nextOpenPosition(1)).toEqual({ row: 2, slot: 1 });
    expect(nextOpenPosition(3)).toEqual({ row: 3, slot: 1 });
  });
});

describe("isEligibleChallenge", () => {
  const rules = { challengeRowRange: 2, challengeSameRow: true };

  it("allows challenging up to N rows above", () => {
    expect(isEligibleChallenge({ row: 4, slot: 1 }, { row: 2, slot: 1 }, rules)).toBe(true);
    expect(isEligibleChallenge({ row: 4, slot: 1 }, { row: 3, slot: 1 }, rules)).toBe(true);
  });

  it("rejects challenges more than N rows above", () => {
    expect(isEligibleChallenge({ row: 4, slot: 1 }, { row: 1, slot: 1 }, rules)).toBe(false);
  });

  it("rejects challenging downward or at a worse/equal slot in the same row", () => {
    expect(isEligibleChallenge({ row: 3, slot: 2 }, { row: 4, slot: 1 }, rules)).toBe(false);
    expect(isEligibleChallenge({ row: 3, slot: 2 }, { row: 3, slot: 3 }, rules)).toBe(false);
    expect(isEligibleChallenge({ row: 3, slot: 2 }, { row: 3, slot: 2 }, rules)).toBe(false);
  });

  it("allows a same-row challenge to a better slot only when enabled", () => {
    expect(isEligibleChallenge({ row: 3, slot: 2 }, { row: 3, slot: 1 }, rules)).toBe(true);
    expect(
      isEligibleChallenge(
        { row: 3, slot: 2 },
        { row: 3, slot: 1 },
        { ...rules, challengeSameRow: false },
      ),
    ).toBe(false);
  });
});

describe("swapPositions", () => {
  it("exchanges the two positions", () => {
    const a = { memberId: "a", position: { row: 2, slot: 1 } };
    const b = { memberId: "b", position: { row: 3, slot: 2 } };
    const [newA, newB] = swapPositions(a, b);
    expect(newA).toEqual({ memberId: "a", position: { row: 3, slot: 2 } });
    expect(newB).toEqual({ memberId: "b", position: { row: 2, slot: 1 } });
  });
});

describe("seedPyramid", () => {
  it("orders members by ITN ascending (lower = stronger)", () => {
    const entries = [
      { memberId: "weak", itn: 8.0, tiebreak: 0 },
      { memberId: "strong", itn: 1.5, tiebreak: 0 },
      { memberId: "mid", itn: 4.0, tiebreak: 0 },
    ];
    const result = seedPyramid(entries);
    expect(result.get("strong")).toEqual({ row: 1, slot: 1 });
    expect(result.get("mid")).toEqual({ row: 2, slot: 1 });
    expect(result.get("weak")).toEqual({ row: 2, slot: 2 });
  });

  it("places members without an ITN after all rated members, ordered by tiebreak", () => {
    const entries = [
      { memberId: "no-itn-2", itn: null, tiebreak: 2 },
      { memberId: "rated", itn: 3.0, tiebreak: 0 },
      { memberId: "no-itn-1", itn: null, tiebreak: 1 },
    ];
    const result = seedPyramid(entries);
    expect(result.get("rated")).toEqual({ row: 1, slot: 1 });
    expect(result.get("no-itn-1")).toEqual({ row: 2, slot: 1 });
    expect(result.get("no-itn-2")).toEqual({ row: 2, slot: 2 });
  });

  it("produces a valid, gap-free pyramid for an arbitrary member count", () => {
    const entries = Array.from({ length: 17 }, (_, i) => ({
      memberId: `m${i}`,
      itn: Math.random() * 9 + 1,
      tiebreak: i,
    }));
    const result = seedPyramid(entries);
    const ranks = [...result.values()].map(rankOf).sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
  });
});

describe("insertionRankByItn", () => {
  const pyramid = (...itns: (number | null)[]) => itns.map((itn) => ({ itn }));

  it("appends members without ITN at the bottom", () => {
    expect(insertionRankByItn(pyramid(3.0, 5.0), null)).toBe(3);
  });

  it("places the new member directly below the last one with a better-or-equal ITN", () => {
    expect(insertionRankByItn(pyramid(2.0, 4.0, 6.0), 5.0)).toBe(3);
    expect(insertionRankByItn(pyramid(2.0, 4.0, 6.0), 4.0)).toBe(3);
  });

  it("goes to the top when nobody in the pyramid has a better ITN", () => {
    expect(insertionRankByItn(pyramid(3.0, 5.0), 1.5)).toBe(1);
    expect(insertionRankByItn(pyramid(null, null), 5.0)).toBe(1);
  });

  it("ignores unrated members and respects the current (post-challenge) order", () => {
    // A 2.0 player who has dropped to rank 3 pulls a 4.0 newcomer below them.
    expect(insertionRankByItn(pyramid(5.0, null, 2.0, 7.0), 4.0)).toBe(4);
  });

  it("handles an empty pyramid", () => {
    expect(insertionRankByItn([], 4.0)).toBe(1);
    expect(insertionRankByItn([], null)).toBe(1);
  });
});
