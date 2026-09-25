"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRuleSettings, removeMemberFromPyramid, updateRuleSettings } from "@/server/seasons";
import { recordAudit } from "@/server/audit";
import { ADMIN_EDITABLE_SETTINGS, divisionSettingsSchema } from "@/lib/settings";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

const patchSchema = divisionSettingsSchema
  .pick(Object.fromEntries(ADMIN_EDITABLE_SETTINGS.map((k) => [k, true])) as {
    [K in (typeof ADMIN_EDITABLE_SETTINGS)[number]]: true;
  })
  .required();

export async function saveRuleSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdmin();

  const raw = Object.fromEntries(
    ADMIN_EDITABLE_SETTINGS.map((k) => [k, Number(formData.get(k) ?? NaN)]),
  );
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Bitte die markierten Werte prüfen.", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const before = await getRuleSettings();
  await updateRuleSettings(parsed.data);
  await recordAudit(adminId, "update_rule_settings", "settings", "rules", before, parsed.data);

  revalidatePath("/admin/regeln");
  revalidatePath("/regeln");
  revalidatePath("/");
  return { success: true };
}

export async function removeFromPyramidAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const seasonId = String(formData.get("seasonId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  if (!seasonId || !memberId) return;

  await removeMemberFromPyramid(seasonId, memberId);
  await recordAudit(adminId, "remove_from_pyramid", "season", seasonId, null, {
    memberId,
    reason: "min_matches",
  });

  revalidatePath("/admin/regeln");
  revalidatePath("/");
}
