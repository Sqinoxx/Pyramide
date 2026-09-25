"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  BOOLEAN_SETTING_FIELDS,
  DEFAULT_DIVISION_SETTINGS,
  NUMERIC_SETTING_FIELDS,
  divisionSettingsSchema,
} from "@/lib/settings";
import { getDivisionSettings, resetInactivityCounter, updateDivisionSettings } from "@/server/seasons";
import { recordAudit } from "@/server/audit";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

function revalidateRulePages() {
  revalidatePath("/admin/einstellungen");
  revalidatePath("/admin");
  revalidatePath("/regeln");
  revalidatePath("/");
}

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdmin();
  const divisionId = String(formData.get("divisionId") ?? "");
  if (!divisionId) return { error: "Bewerb fehlt." };

  const raw: Record<string, unknown> = {};
  for (const { key } of NUMERIC_SETTING_FIELDS) {
    const value = String(formData.get(key) ?? "").trim();
    raw[key] = value === "" ? undefined : Number(value);
  }
  for (const { key } of BOOLEAN_SETTING_FIELDS) {
    raw[key] = formData.get(key) === "on";
  }

  const parsed = divisionSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Bitte die markierten Werte korrigieren.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const applyToActiveSeason = formData.get("applyToActiveSeason") === "on";
  const before = await getDivisionSettings(divisionId);
  const seasonId = await updateDivisionSettings(divisionId, parsed.data, applyToActiveSeason);
  await recordAudit(adminId, "update_settings", "division", divisionId, before, {
    ...parsed.data,
    appliedToSeason: seasonId,
  });

  revalidateRulePages();
  return { success: true };
}

export async function resetSettingsAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const divisionId = String(formData.get("divisionId") ?? "");
  if (!divisionId) return;

  const before = await getDivisionSettings(divisionId);
  await updateDivisionSettings(divisionId, DEFAULT_DIVISION_SETTINGS, true);
  await recordAudit(adminId, "reset_settings", "division", divisionId, before, DEFAULT_DIVISION_SETTINGS);
  revalidateRulePages();
}

export async function resetInactivityAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const seasonId = String(formData.get("seasonId") ?? "");
  if (!seasonId) return;

  await resetInactivityCounter(seasonId);
  await recordAudit(adminId, "reset_inactivity", "season", seasonId);
  revalidateRulePages();
}
