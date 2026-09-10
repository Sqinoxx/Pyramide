"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMemberByUserId } from "@/server/members";
import {
  acceptChallenge,
  confirmResult,
  createChallenge,
  declineChallenge,
  disputeResult,
  reportResult,
  ChallengeError,
} from "@/server/challenges";
import { MatchFormatError, type SetScore } from "@/lib/match-result";
import type { ActionState } from "@/lib/form-state";

async function requireMember() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const member = await getMemberByUserId(session.user.id);
  if (!member) throw new Error("No member profile for this account");
  return member;
}

export async function createChallengeAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const seasonId = String(formData.get("seasonId") ?? "");
  const defenderId = String(formData.get("defenderId") ?? "");

  try {
    await createChallenge(seasonId, member.id, defenderId);
  } catch (err) {
    if (err instanceof ChallengeError) {
      redirect(`/forderungen?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/");
  redirect("/forderungen");
}

export async function acceptChallengeAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const challengeId = String(formData.get("challengeId") ?? "");
  await acceptChallenge(challengeId, member.id);
  revalidatePath("/forderungen");
}

export async function declineChallengeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireMember();
  const challengeId = String(formData.get("challengeId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  try {
    await declineChallenge(challengeId, member.id, reason);
  } catch (err) {
    if (err instanceof ChallengeError) return { error: err.message };
    throw err;
  }

  revalidatePath("/forderungen");
  revalidatePath("/");
  return { success: true };
}

export async function reportResultAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireMember();
  const challengeId = String(formData.get("challengeId") ?? "");

  const sets: SetScore[] = [];
  for (let i = 1; i <= 3; i++) {
    const gamesA = formData.get(`set${i}A`);
    const gamesB = formData.get(`set${i}B`);
    if (gamesA === null || gamesB === null || gamesA === "" || gamesB === "") continue;
    const tiebreakA = formData.get(`set${i}TbA`);
    const tiebreakB = formData.get(`set${i}TbB`);
    sets.push({
      gamesA: Number(gamesA),
      gamesB: Number(gamesB),
      tiebreakA: tiebreakA ? Number(tiebreakA) : undefined,
      tiebreakB: tiebreakB ? Number(tiebreakB) : undefined,
    });
  }

  try {
    await reportResult(challengeId, member.id, sets);
  } catch (err) {
    if (err instanceof MatchFormatError || err instanceof ChallengeError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/forderungen");
  return { success: true };
}

export async function confirmResultAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const challengeId = String(formData.get("challengeId") ?? "");
  await confirmResult(challengeId, member.id);
  revalidatePath("/forderungen");
  revalidatePath("/");
}

export async function disputeResultAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const challengeId = String(formData.get("challengeId") ?? "");
  await disputeResult(challengeId, member.id);
  revalidatePath("/forderungen");
}
