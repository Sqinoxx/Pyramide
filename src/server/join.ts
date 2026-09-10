import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, users } from "@/db/schema";
import { normalizeName } from "@/lib/itn-match";
import { createVerificationToken } from "./tokens";
import { sendAdminApprovalNeededEmail, sendJoinConfirmationEmail } from "./mailer";
import { getDivisionForGender, setSelfItn } from "./members";
import { findClubMemberCandidates, type ClubMemberMatch } from "./club-members";
import type { JoinInput } from "@/lib/validation";

export class EmailInUseError extends Error {
  constructor() {
    super("E-Mail-Adresse wird bereits verwendet");
    this.name = "EmailInUseError";
  }
}

/**
 * Joining the pyramid (replaces the old password-based registerMember()):
 * UTC Neukirchen already has its own membership system, so identity here
 * is proven by clicking the magic-link email rather than by setting a
 * password (see src/auth.ts's "magic-link" provider) — there is no
 * separate "verify your email" step, consuming that link *is* the
 * verification. Admin approval afterward (approveMember() in
 * src/server/members.ts) is unchanged and still required — matching the
 * club roster only helps the admin decide, it never joins someone
 * automatically. See club-members.ts for that matching.
 */
export async function joinPyramid(input: JoinInput): Promise<{ userId: string; memberId: string }> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw new EmailInUseError();

  const division = await getDivisionForGender(input.gender);

  const clubMatch: ClubMemberMatch = await findClubMemberCandidates({
    lastName: input.lastName,
    firstName: input.firstName,
    birthYear: input.birthYear,
    gender: input.gender,
    club: null,
  });

  const { user, member } = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: input.email, passwordHash: null, role: "member" })
      .returning();

    const [member] = await tx
      .insert(members)
      .values({
        userId: user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        birthYear: input.birthYear,
        gender: input.gender,
        club: input.club || null,
        phone: input.phone || null,
        divisionId: division.id,
        status: "pending",
        normalizedName: normalizeName(input.lastName, input.firstName),
      })
      .returning();

    return { user, member };
  });

  if (input.itn !== null) {
    await setSelfItn(member.id, user.id, input.itn);
  }

  const rawToken = await createVerificationToken(user.email, "magic-login");
  // The account already exists at this point — an SMTP hiccup here must
  // not look like "Anmeldung fehlgeschlagen" with no way back to a real
  // account. They can request a new link from /login like any returning
  // member once one exists.
  await sendJoinConfirmationEmail(user.email, member.firstName, rawToken).catch((err) => {
    console.error("[join] confirmation email failed to send", err);
  });

  const admins = await db.query.users.findMany({ where: eq(users.role, "admin") });
  const matchNote =
    clubMatch.tier === "auto"
      ? " (als Vereinsmitglied erkannt)"
      : clubMatch.tier === "none"
        ? " (kein Treffer in der Mitgliederliste — bitte prüfen)"
        : " (möglicher Treffer in der Mitgliederliste — bitte prüfen)";
  await Promise.all(
    admins.map((admin) =>
      sendAdminApprovalNeededEmail(
        admin.email,
        `${member.firstName} ${member.lastName}${matchNote}`,
      ).catch(() => {
        // Best-effort: a failed admin notification shouldn't fail the join.
      }),
    ),
  );

  return { userId: user.id, memberId: member.id };
}
