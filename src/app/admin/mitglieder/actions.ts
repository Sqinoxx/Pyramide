"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { approveMember } from "@/server/members";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
}

export async function approveMemberAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) throw new Error("Missing memberId");
  await approveMember(memberId);
  revalidatePath("/admin/mitglieder");
}
