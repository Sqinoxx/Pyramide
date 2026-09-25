"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { profileSchema, selfItnSchema, setLeaveSchema } from "@/lib/validation";
import {
  clearOnLeave,
  confirmItnMatch,
  getMemberByUserId,
  setOnLeave,
  setSelfItn,
  updateMemberProfile,
} from "@/server/members";
import { dismissItnCandidate, findItnCandidatesForMember } from "@/server/itn-matching";
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

/**
 * A member confirming a suggested ITN match themselves ("Das bin ich",
 * PLAN.md §5.2). Unlike the admin equivalent (src/app/admin/itn/actions.ts),
 * this re-derives the candidate list server-side and only accepts an
 * itnRecordId that's actually in it — otherwise a member could link an
 * arbitrary official record (and its ITN, which outranks a self entry) to
 * themselves.
 */
export async function confirmOwnItnMatchAction(formData: FormData): Promise<void> {
  const { member, userId } = await requireMember();
  const itnRecordId = String(formData.get("itnRecordId") ?? "");

  const { candidates } = await findItnCandidatesForMember(member);
  if (!candidates.some((c) => c.itnRecordId === itnRecordId)) {
    throw new Error("Not a valid candidate for this member");
  }

  await confirmItnMatch(member.id, itnRecordId, userId);
  revalidatePath("/profil");
}

export async function dismissOwnItnMatchAction(formData: FormData): Promise<void> {
  const { member, userId } = await requireMember();
  const itnRecordId = String(formData.get("itnRecordId") ?? "");
  await dismissItnCandidate(member.id, itnRecordId, userId);
  revalidatePath("/profil");
}

export async function setLeaveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { member } = await requireMember();
  const parsed = setLeaveSchema.safeParse({ until: formData.get("until") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  await setOnLeave(member.id, new Date(parsed.data.until));
  revalidatePath("/profil");
  return { success: true };
}

export async function clearLeaveAction(): Promise<void> {
  const { member } = await requireMember();
  await clearOnLeave(member.id);
  revalidatePath("/profil");
}
