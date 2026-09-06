"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { startSeason, SeasonAlreadyActiveError } from "@/server/seasons";
import type { ActionState } from "@/lib/form-state";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
}

export async function startSeasonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const divisionId = String(formData.get("divisionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!divisionId || !name) {
    return { error: "Bitte Bewerb und Saisonnamen angeben." };
  }

  try {
    await startSeason(divisionId, name);
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
