import "server-only";
import { and, asc, eq, isNull, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  divisions,
  members,
  memberItn,
  itnLinks,
  itnRecords,
  positions,
  positionHistory,
  seasons,
  users,
} from "@/db/schema";
import { resolveActiveItn, type ActiveItn } from "@/lib/itn-precedence";
import { insertionRankByItn, positionOfRank, rankOf } from "@/lib/pyramid";
import { sendMemberApprovedEmail } from "./mailer";

export async function getDivisionForGender(gender: "m" | "w") {
  const key = gender === "m" ? "herren" : "damen";
  const division = await db.query.divisions.findFirst({ where: eq(divisions.key, key) });
  if (!division) throw new Error(`Division "${key}" is not set up yet`);
  return division;
}

/**
 * Marks the account's email verified. For members this only ever happens as
 * a side effect of consuming a magic-link token (src/auth.ts) — clicking
 * the link they were emailed *is* the verification, there's no separate
 * step. See src/server/join.ts for where the account itself gets created.
 */
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
 * has an active season — inserts them into the pyramid by ITN right away
 * (see insertionRankByItn() in src/lib/pyramid.ts; no ITN → bottom).
 * Everyone from that rank down moves one rank lower. All moves, including
 * the newcomer's own placement, are recorded with reason "insert".
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
        // Locked in rank order so a concurrent swap/insert can't reshuffle
        // the pyramid between computing the insertion rank and shifting.
        const current = await tx
          .select()
          .from(positions)
          .where(eq(positions.seasonId, season.id))
          .orderBy(asc(positions.row), asc(positions.slot))
          .for("update");

        const itnOf = async (id: string) => (await getActiveItnForMember(id))?.value ?? null;
        const [ownItn, existingItns] = await Promise.all([
          itnOf(memberId),
          Promise.all(current.map(async (p) => ({ itn: await itnOf(p.memberId) }))),
        ]);
        // insertionRankByItn() works on list indices; map back to a real
        // rank so a gap in the pyramid can't misplace the newcomer.
        const idx = insertionRankByItn(existingItns, ownItn) - 1;
        const rank =
          idx < current.length
            ? rankOf(current[idx])
            : current.length > 0
              ? rankOf(current[current.length - 1]) + 1
              : 1;

        // Shift everyone at or below `rank` down by one, bottom-up so each
        // target slot is already free (UNIQUE(season, row, slot) isn't
        // deferrable).
        const displaced = current.filter((p) => rankOf(p) >= rank).reverse();
        for (const p of displaced) {
          const to = positionOfRank(rankOf(p) + 1);
          await tx
            .update(positions)
            .set({ row: to.row, slot: to.slot, since: new Date() })
            .where(eq(positions.id, p.id));
        }

        const pos = positionOfRank(rank);
        await tx.insert(positions).values({
          seasonId: season.id,
          memberId,
          row: pos.row,
          slot: pos.slot,
        });
        await tx.insert(positionHistory).values([
          {
            seasonId: season.id,
            memberId,
            fromRow: null,
            fromSlot: null,
            toRow: pos.row,
            toSlot: pos.slot,
            reason: "insert" as const,
          },
          ...displaced.map((p) => {
            const to = positionOfRank(rankOf(p) + 1);
            return {
              seasonId: season.id,
              memberId: p.memberId,
              fromRow: p.row,
              fromSlot: p.slot,
              toRow: to.row,
              toSlot: to.slot,
              reason: "insert" as const,
            };
          }),
        ]);
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
  data: { club?: string | null; phone?: string | null; preferredTimes?: string | null },
) {
  await db
    .update(members)
    .set({
      club: data.club || null,
      phone: data.phone || null,
      preferredTimes: data.preferredTimes || null,
    })
    .where(eq(members.id, memberId));
}

/**
 * Members (active or pending) who don't yet have a confirmed *import*
 * ITN link — i.e. still worth running through the matching UI (PLAN.md
 * §5.2). A member with only a self-reported value still shows up here,
 * since a self entry never counts as "matched" against the official list.
 */
export async function listMembersForItnReview() {
  return db
    .select({ member: members, division: divisions })
    .from(members)
    .leftJoin(divisions, eq(members.divisionId, divisions.id))
    .where(
      and(
        sql`${members.status} in ('active', 'pending')`,
        notExists(
          db
            .select({ x: sql`1` })
            .from(memberItn)
            .where(
              and(
                eq(memberItn.memberId, members.id),
                eq(memberItn.source, "import"),
                isNull(memberItn.supersededAt),
              ),
            ),
        ),
      ),
    )
    .orderBy(members.lastName, members.firstName);
}

/**
 * Confirms a match between a member and an official ITN record — either the
 * member themselves ("Das bin ich") or an admin acting on their behalf
 * (PLAN.md §5.2: "Admin kann überschreiben"). Supersedes any prior *import*
 * entry so re-matching after a newer import doesn't leave two active rows.
 */
export async function confirmItnMatch(memberId: string, itnRecordId: string, confirmedByUserId: string) {
  await db.transaction(async (tx) => {
    const record = await tx.query.itnRecords.findFirst({ where: eq(itnRecords.id, itnRecordId) });
    if (!record) throw new Error("ITN record not found");

    await tx
      .insert(itnLinks)
      .values({
        memberId,
        itnRecordId,
        confidence: "1.000",
        confirmedBy: confirmedByUserId,
        confirmedAt: new Date(),
      })
      .onConflictDoNothing();

    await tx
      .update(memberItn)
      .set({ supersededAt: new Date() })
      .where(
        and(
          eq(memberItn.memberId, memberId),
          eq(memberItn.source, "import"),
          isNull(memberItn.supersededAt),
        ),
      );

    await tx.insert(memberItn).values({
      memberId,
      source: "import",
      value: record.itn,
      licenceNo: record.licenceNo,
      asOf: record.validFrom,
      createdBy: confirmedByUserId,
    });
  });
}

/** Admin-set ITN estimate for a member with no official match (PLAN.md §5.3). */
export async function setAdminItn(memberId: string, value: number, setByUserId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(memberItn)
      .set({ supersededAt: new Date() })
      .where(
        and(
          eq(memberItn.memberId, memberId),
          eq(memberItn.source, "admin"),
          isNull(memberItn.supersededAt),
        ),
      );
    await tx.insert(memberItn).values({
      memberId,
      source: "admin",
      value: value.toFixed(1),
      createdBy: setByUserId,
    });
  });
}

/**
 * Urlaubs-/Verletzungsmodus (PLAN.md §4.5): while `onLeaveUntil` is in the
 * future, getEligibleDefenders() (src/server/challenges.ts) excludes the
 * member both as a possible defender and — since it's checked from the
 * other side too — effectively as a challenger, and the inactivity job
 * (src/server/jobs/inactivity.ts) skips them so the clock doesn't run
 * while they're deliberately away.
 */
export async function setOnLeave(memberId: string, until: Date) {
  await db.update(members).set({ onLeaveUntil: until }).where(eq(members.id, memberId));
}

export async function clearOnLeave(memberId: string) {
  await db.update(members).set({ onLeaveUntil: null }).where(eq(members.id, memberId));
}

/**
 * Member directory (PLAN.md v1 "Suche/Filter Mitgliederliste") — only
 * active members, and deliberately not phone/email (contact happens via
 * notifications, see sendContactMessage in this file, "ohne Preisgabe von
 * Telefonnummern").
 */
export async function listActiveMembers(query?: string) {
  const q = query?.trim().toLowerCase();
  const rows = await db.query.members.findMany({
    where: eq(members.status, "active"),
    orderBy: (m, { asc }) => [asc(m.lastName), asc(m.firstName)],
    with: { division: true },
  });
  if (!q) return rows;
  return rows.filter(
    (m) =>
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      m.club?.toLowerCase().includes(q),
  );
}
