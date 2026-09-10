"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { confirmItnMatch, setAdminItn } from "@/server/members";
import { dismissItnCandidate } from "@/server/itn-matching";
import { selfItnSchema } from "@/lib/validation";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";
import { recordAudit } from "@/server/audit";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

export async function confirmMatchAction(formData: FormData): Promise<void> {
  const userId = await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  const itnRecordId = String(formData.get("itnRecordId") ?? "");
  if (!memberId || !itnRecordId) throw new Error("Missing fields");
  await confirmItnMatch(memberId, itnRecordId, userId);
  await recordAudit(userId, "confirm_itn_match", "member", memberId, null, { itnRecordId });
  revalidatePath("/admin/itn");
}

export async function dismissMatchAction(formData: FormData): Promise<void> {
  const userId = await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  const itnRecordId = String(formData.get("itnRecordId") ?? "");
  if (!memberId || !itnRecordId) throw new Error("Missing fields");
  await dismissItnCandidate(memberId, itnRecordId, userId);
  await recordAudit(userId, "dismiss_itn_match", "member", memberId, null, { itnRecordId });
  revalidatePath("/admin/itn");
}

export async function setAdminItnAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  const parsed = selfItnSchema.safeParse({ value: formData.get("value") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  await setAdminItn(memberId, parsed.data.value, userId);
  await recordAudit(userId, "set_admin_itn", "member", memberId, null, { value: parsed.data.value });
  revalidatePath("/admin/itn");
  return { success: true };
}
