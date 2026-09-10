"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { approveMember } from "@/server/members";
import { recordAudit } from "@/server/audit";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

export async function approveMemberAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) throw new Error("Missing memberId");
  await approveMember(memberId);
  await recordAudit(adminId, "approve_member", "member", memberId);
  revalidatePath("/admin/mitglieder");
}
