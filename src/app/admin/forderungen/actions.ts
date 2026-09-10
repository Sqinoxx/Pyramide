"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { adminResolveChallenge } from "@/server/challenges";
import { recordAudit } from "@/server/audit";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

export async function resolveDisputeAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const challengeId = String(formData.get("challengeId") ?? "");
  const winnerIdRaw = String(formData.get("winnerId") ?? "");
  await adminResolveChallenge(challengeId, winnerIdRaw || null);
  await recordAudit(adminId, "resolve_dispute", "challenge", challengeId, null, {
    winnerId: winnerIdRaw || null,
  });
  revalidatePath("/admin/forderungen");
  revalidatePath("/");
}
