import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  divisions,
  members,
  memberItn,
  positions,
  positionHistory,
  seasons,
  users,
} from "@/db/schema";
import { normalizeName } from "@/lib/itn-match";
import { resolveActiveItn, type ActiveItn } from "@/lib/itn-precedence";
import { nextOpenPosition } from "@/lib/pyramid";
import { hashPassword } from "@/lib/password";
import { createVerificationToken } from "./tokens";
import { sendAdminApprovalNeededEmail, sendMemberApprovedEmail, sendVerificationEmail } from "./mailer";
import type { RegisterInput } from "@/lib/validation";

export async function getDivisionForGender(gender: "m" | "w") {
  const key = gender === "m" ? "herren" : "damen";
  const division = await db.query.divisions.findFirst({ where: eq(divisions.key, key) });
  if (!division) throw new Error(`Division "${key}" is not set up yet`);
  return division;
}

export class EmailInUseError extends Error {
  constructor() {
    super("E-Mail-Adresse wird bereits verwendet");
    this.name = "EmailInUseError";
  }
}

/**
 * Registration (PLAN.md §3): creates the user + member row (status
 * "pending"), assigns the division from gender, and sends the verification
 * email. Admin approval and pyramid placement happen later in
 * approveMember(), once the address is confirmed.
 */
export async function registerMember(input: RegisterInput) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw new EmailInUseError();

  const division = await getDivisionForGender(input.gender);
  const passwordHash = await hashPassword(input.password);

  const { user, member } = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: input.email, passwordHash, role: "member" })
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

  const rawToken = await createVerificationToken(user.email, "verify-email");
  await sendVerificationEmail(user.email, member.firstName, rawToken);

  const admins = await db.query.users.findMany({ where: eq(users.role, "admin") });
  await Promise.all(
    admins.map((admin) =>
      sendAdminApprovalNeededEmail(admin.email, `${member.firstName} ${member.lastName}`).catch(
        () => {
          // Best-effort: a failed admin notification shouldn't fail registration.
        },
      ),
    ),
  );

  return { userId: user.id, memberId: member.id };
}

export async function markEmailVerified(email: string) {
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.email, email));
}

export async function listPendingMembers() {
  return db.query.members.findMany({
    where: eq(members.status, "pending"),
    with: { user: true, division: true },
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
}

/**
 * Admin approval: flips the member active and — if the division currently
 * has an active season — appends them at the bottom of the pyramid (PLAN.md
 * §5.3, "später Beitretende starten unten"). Recorded with reason "admin"
 * since there's no dedicated position_reason value for a plain mid-season
 * join; the audit trail on the challenge/season side never needs to
 * distinguish the two.
 */
export async function approveMember(memberId: string) {
  const updated = await db.transaction(async (tx) => {
    const member = await tx.query.members.findFirst({ where: eq(members.id, memberId) });
    if (!member) throw new Error("Member not found");
    if (member.status !== "pending") return member;

    const [updated] = await tx
      .update(members)
      .set({ status: "active", joinedAt: new Date() })
      .where(eq(members.id, memberId))
      .returning();

    if (member.divisionId) {
      const season = await tx.query.seasons.findFirst({
        where: and(eq(seasons.divisionId, member.divisionId), eq(seasons.status, "active")),
      });

      if (season) {
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(positions)
          .where(eq(positions.seasonId, season.id));

        const pos = nextOpenPosition(count);
        await tx.insert(positions).values({
          seasonId: season.id,
          memberId,
          row: pos.row,
          slot: pos.slot,
        });
        await tx.insert(positionHistory).values({
          seasonId: season.id,
          memberId,
          fromRow: null,
          fromSlot: null,
          toRow: pos.row,
          toSlot: pos.slot,
          reason: "admin",
        });
      }
    }

    return updated;
  });

  const [division, user] = await Promise.all([
    updated.divisionId
      ? db.query.divisions.findFirst({ where: eq(divisions.id, updated.divisionId) })
      : null,
    db.query.users.findFirst({ where: eq(users.id, updated.userId) }),
  ]);
  if (user && division) {
    await sendMemberApprovedEmail(user.email, updated.firstName, division.name).catch(() => {
      // Best-effort: approval already committed even if the notification fails.
    });
  }

  return updated;
}

export async function getMemberByUserId(userId: string) {
  return db.query.members.findFirst({
    where: eq(members.userId, userId),
    with: { division: true },
  });
}

export async function getActiveItnForMember(memberId: string): Promise<ActiveItn | null> {
  const entries = await db.query.memberItn.findMany({ where: eq(memberItn.memberId, memberId) });
  return resolveActiveItn(
    entries.map((e) => ({
      source: e.source,
      value: Number(e.value),
      asOf: e.asOf,
      supersededAt: e.supersededAt,
    })),
  );
}

/**
 * Records a self-reported ITN value (PLAN.md §5.4). Never overwrites a prior
 * self entry — it supersedes it, so the history stays intact for the
 * mismatch check against a later official import.
 */
export async function setSelfItn(memberId: string, userId: string, value: number) {
  await db.transaction(async (tx) => {
    await tx
      .update(memberItn)
      .set({ supersededAt: new Date() })
      .where(
        and(
          eq(memberItn.memberId, memberId),
          eq(memberItn.source, "self"),
          isNull(memberItn.supersededAt),
        ),
      );

    await tx.insert(memberItn).values({
      memberId,
      source: "self",
      value: value.toFixed(1),
      createdBy: userId,
    });
  });
}

export async function updateMemberProfile(
  memberId: string,
  data: { club?: string | null; phone?: string | null; preferredTimes?: string | null; showItnPublicly: boolean },
) {
  await db
    .update(members)
    .set({
      club: data.club || null,
      phone: data.phone || null,
      preferredTimes: data.preferredTimes || null,
      showItnPublicly: data.showItnPublicly,
    })
    .where(eq(members.id, memberId));
}
