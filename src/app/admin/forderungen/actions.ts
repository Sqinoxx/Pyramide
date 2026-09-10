"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { adminResolveChallenge } from "@/server/challenges";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
}

export async function resolveDisputeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const challengeId = String(formData.get("challengeId") ?? "");
  const winnerIdRaw = String(formData.get("winnerId") ?? "");
  await adminResolveChallenge(challengeId, winnerIdRaw || null);
  revalidatePath("/admin/forderungen");
  revalidatePath("/");
}
