"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { profileSchema, selfItnSchema } from "@/lib/validation";
import { getMemberByUserId, setSelfItn, updateMemberProfile } from "@/server/members";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";

async function requireMember() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const member = await getMemberByUserId(session.user.id);
  if (!member) throw new Error("No member profile for this account");
  return { userId: session.user.id, member };
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { member } = await requireMember();

  const raw = {
    club: formData.get("club"),
    phone: formData.get("phone"),
    preferredTimes: formData.get("preferredTimes"),
    showItnPublicly: formData.get("showItnPublicly") === "on",
  };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  await updateMemberProfile(member.id, parsed.data);
  revalidatePath("/profil");
  return { success: true };
}

export async function setSelfItnAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { member, userId } = await requireMember();

  const parsed = selfItnSchema.safeParse({ value: formData.get("value") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  await setSelfItn(member.id, userId, parsed.data.value);
  revalidatePath("/profil");
  return { success: true };
}
