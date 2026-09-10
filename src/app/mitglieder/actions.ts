"use server";

import { auth } from "@/auth";
import { getMemberByUserId } from "@/server/members";
import { sendContactMessage } from "@/server/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { initialActionState, type ActionState } from "@/lib/form-state";

export async function sendContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const member = await getMemberByUserId(session.user.id);
  if (!member) throw new Error("No member profile for this account");

  const toMemberId = String(formData.get("toMemberId") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!message) {
    return { error: "Bitte eine Nachricht eingeben." };
  }
  if (message.length > 1000) {
    return { error: "Nachricht ist zu lang (max. 1000 Zeichen)." };
  }
  if (toMemberId === member.id) {
    return { error: "Du kannst dir nicht selbst schreiben." };
  }

  const limit = checkRateLimit(`contact:${member.id}`, 20, 60 * 60_000);
  if (!limit.allowed) {
    return { error: "Zu viele Nachrichten. Bitte später erneut versuchen." };
  }

  await sendContactMessage(member.id, toMemberId, `${member.firstName} ${member.lastName}`, message);
  return { ...initialActionState, success: true };
}
