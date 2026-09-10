"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getMemberByUserId } from "@/server/members";
import { markAllNotificationsRead, markNotificationRead } from "@/server/notifications";

async function requireMemberId() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const member = await getMemberByUserId(session.user.id);
  if (!member) throw new Error("No member profile for this account");
  return member.id;
}

export async function markAllReadAction(): Promise<void> {
  const memberId = await requireMemberId();
  await markAllNotificationsRead(memberId);
  revalidatePath("/benachrichtigungen");
}

export async function markReadAction(formData: FormData): Promise<void> {
  const memberId = await requireMemberId();
  const notificationId = String(formData.get("notificationId") ?? "");
  await markNotificationRead(notificationId, memberId);
  revalidatePath("/benachrichtigungen");
}
