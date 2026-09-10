import "server-only";
import { and, eq } from "drizzle-orm";
import { positions, positionHistory } from "@/db/schema";
import type { Tx } from "./db-types";
import type { Position } from "@/lib/pyramid";

type SwapSide = {
  memberId: string;
  reason: "challenge_win" | "swap_loss" | "inactivity" | "admin";
  challengeId?: string;
};

export type SwapResult = { aTo: Position; bTo: Position };

/**
 * Swaps two members' positions within `seasonId` and writes the matching
 * position_history pair. Used everywhere a position actually changes hands:
 * challenge settlement (src/server/challenges.ts), inactivity demotion
 * (src/server/jobs/inactivity.ts), and manual admin correction
 * (src/server/seasons.ts).
 *
 * Runs a 3-step temp-slot shuffle (park `a` at (-1,-1), move `b` into the
 * freed spot, then move `a` into `b`'s old spot) rather than a direct 2-row
 * update: the plain (non-deferrable) UNIQUE(season, row, slot) index would
 * otherwise reject the intermediate state where both rows briefly share a
 * value. Both rows are locked with SELECT ... FOR UPDATE first, which
 * serializes concurrent swaps that touch either of *these* two rows — two
 * unrelated swaps in the same season landing on (-1,-1) at the exact same
 * instant would abort with a unique violation instead of corrupting
 * anything, which is acceptable at club-roster concurrency and safe to
 * just retry.
 *
 * Returns `null` if either member currently has no position in this season
 * (caller decides whether that's an error or a silent no-op).
 */
export async function swapMemberPositions(
  tx: Tx,
  seasonId: string,
  a: SwapSide,
  b: SwapSide,
): Promise<SwapResult | null> {
  const [aRow] = await tx
    .select()
    .from(positions)
    .where(and(eq(positions.seasonId, seasonId), eq(positions.memberId, a.memberId)))
    .for("update");
  const [bRow] = await tx
    .select()
    .from(positions)
    .where(and(eq(positions.seasonId, seasonId), eq(positions.memberId, b.memberId)))
    .for("update");
  if (!aRow || !bRow) return null;

  await tx.update(positions).set({ row: -1, slot: -1 }).where(eq(positions.id, aRow.id));
  await tx
    .update(positions)
    .set({ row: aRow.row, slot: aRow.slot, since: new Date() })
    .where(eq(positions.id, bRow.id));
  await tx
    .update(positions)
    .set({ row: bRow.row, slot: bRow.slot, since: new Date() })
    .where(eq(positions.id, aRow.id));

  await tx.insert(positionHistory).values([
    {
      seasonId,
      memberId: a.memberId,
      fromRow: aRow.row,
      fromSlot: aRow.slot,
      toRow: bRow.row,
      toSlot: bRow.slot,
      reason: a.reason,
      challengeId: a.challengeId ?? null,
    },
    {
      seasonId,
      memberId: b.memberId,
      fromRow: bRow.row,
      fromSlot: bRow.slot,
      toRow: aRow.row,
      toSlot: aRow.slot,
      reason: b.reason,
      challengeId: b.challengeId ?? null,
    },
  ]);

  return {
    aTo: { row: bRow.row, slot: bRow.slot },
    bTo: { row: aRow.row, slot: aRow.slot },
  };
}
