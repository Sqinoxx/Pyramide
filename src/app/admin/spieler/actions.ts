"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { clearOnLeave, setOnLeave } from "@/server/members";
import { recordAudit } from "@/server/audit";
import { setLeaveSchema } from "@/lib/validation";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

export async function adminSetLeaveAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  const parsed = setLeaveSchema.safeParse({ until: formData.get("until") });
  if (!memberId || !parsed.success) return;

  await setOnLeave(memberId, new Date(parsed.data.until));
  await recordAudit(adminId, "admin_set_leave", "member", memberId, null, {
    until: parsed.data.until,
  });
  revalidatePath("/admin/spieler");
  revalidatePath("/");
}

export async function adminClearLeaveAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return;

  await clearOnLeave(memberId);
  await recordAudit(adminId, "admin_clear_leave", "member", memberId);
  revalidatePath("/admin/spieler");
  revalidatePath("/");
}
