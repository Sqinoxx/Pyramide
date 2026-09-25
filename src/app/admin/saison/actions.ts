"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  startSeason,
  SeasonAlreadyActiveError,
  adminSwapPositions,
  endSeason,
  renameSeason,
} from "@/server/seasons";
import { recordAudit } from "@/server/audit";
import type { ActionState } from "@/lib/form-state";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

export async function startSeasonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdmin();

  const divisionId = String(formData.get("divisionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!divisionId || !name) {
    return { error: "Bitte Bewerb und Saisonnamen angeben." };
  }

  try {
    const season = await startSeason(divisionId, name);
    await recordAudit(adminId, "start_season", "season", season.id, null, { divisionId, name });
  } catch (err) {
    if (err instanceof SeasonAlreadyActiveError) {
      return { error: err.message };
    }
    console.error("[start-season] failed", err);
    return { error: "Saison konnte nicht gestartet werden." };
  }

  revalidatePath("/admin/saison");
  revalidatePath("/");
  return { success: true };
}

export async function adminSwapPositionsAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const seasonId = String(formData.get("seasonId") ?? "");
  const memberAId = String(formData.get("memberAId") ?? "");
  const memberBId = String(formData.get("memberBId") ?? "");
  if (!seasonId || !memberAId || !memberBId || memberAId === memberBId) return;

  await adminSwapPositions(seasonId, memberAId, memberBId);
  await recordAudit(adminId, "admin_move_position", "season", seasonId, null, {
    memberAId,
    memberBId,
  });
  revalidatePath("/admin/saison");
  revalidatePath("/");
}

export async function endSeasonAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const seasonId = String(formData.get("seasonId") ?? "");
  // The confirmation checkbox is `required` in the form; re-checked here so
  // a stray request can't close a season by accident.
  if (!seasonId || formData.get("confirm") !== "on") return;

  const result = await endSeason(seasonId);
  if (!result) return;
  await recordAudit(adminId, "end_season", "season", seasonId, null, {
    cancelledChallenges: result.cancelledChallenges,
  });
  revalidatePath("/admin/saison");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function renameSeasonAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const seasonId = String(formData.get("seasonId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!seasonId || !name) return;

  await renameSeason(seasonId, name);
  await recordAudit(adminId, "rename_season", "season", seasonId, null, { name });
  revalidatePath("/admin/saison");
  revalidatePath("/");
}
