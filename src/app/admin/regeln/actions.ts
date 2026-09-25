"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { removeMemberFromPyramid } from "@/server/seasons";
import { recordAudit } from "@/server/audit";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
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
  revalidatePath("/admin/spieler");
  revalidatePath("/");
}
