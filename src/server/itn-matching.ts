import "server-only";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { itnMatchDismissals, type members as membersTable } from "@/db/schema";
import { scoreCandidate, classifyMatches, type ItnCandidate } from "@/lib/itn-match";

type MemberRow = typeof membersTable.$inferSelect;

export type MatchCandidate = {
  itnRecordId: string;
  lastName: string;
  firstName: string;
  birthYear: number | null;
  club: string | null;
  itn: number;
  score: number;
};

export type MemberMatchResult = {
  tier: "auto" | "suggest" | "none";
  candidates: MatchCandidate[];
};

/**
 * Trigram-similarity search over itn_records for one member (PLAN.md §5.2).
 * Raw SQL because Drizzle's query builder has no helper for pg_trgm's
 * `similarity()` — the % operator and the GIN index on normalized_name
 * (see drizzle/0000, drizzle.config schema) make this cheap even for a
 * full-table scan-shaped query at club-roster sizes.
 */
export async function findItnCandidatesForMember(member: MemberRow): Promise<MemberMatchResult> {
  const dismissed = await db.query.itnMatchDismissals.findMany({
    where: eq(itnMatchDismissals.memberId, member.id),
  });
  const dismissedIds = new Set(dismissed.map((d) => d.itnRecordId));

  const rows = (await db.execute(sql`
    select id, last_name, first_name, birth_year, gender, club, itn,
           similarity(normalized_name, ${member.normalizedName}) as sim
    from itn_records
    where normalized_name % ${member.normalizedName}
    order by sim desc
    limit 8
  `)) as unknown as Array<{
    id: string;
    last_name: string;
    first_name: string;
    birth_year: number | null;
    gender: "m" | "w" | "d" | null;
    club: string | null;
    itn: string;
    sim: number;
  }>;

  const candidates: ItnCandidate[] = rows
    .filter((r) => !dismissedIds.has(r.id))
    .map((r) => ({
      itnRecordId: r.id,
      lastName: r.last_name,
      firstName: r.first_name,
      birthYear: r.birth_year,
      gender: r.gender,
      club: r.club,
      similarity: r.sim,
    }));

  const scored = candidates.map((c) =>
    scoreCandidate(
      {
        lastName: member.lastName,
        firstName: member.firstName,
        birthYear: member.birthYear,
        gender: member.gender === "d" ? "m" : member.gender, // scoring bonus only, no hard filter
        club: member.club,
      },
      c,
    ),
  );

  const { tier, candidates: ranked } = classifyMatches(scored);

  return {
    tier,
    candidates: ranked.map((c) => ({
      itnRecordId: c.itnRecordId,
      lastName: c.lastName,
      firstName: c.firstName,
      birthYear: c.birthYear,
      club: c.club,
      itn: Number(rows.find((r) => r.id === c.itnRecordId)!.itn),
      score: c.score,
    })),
  };
}

export async function dismissItnCandidate(memberId: string, itnRecordId: string, userId: string) {
  await db
    .insert(itnMatchDismissals)
    .values({ memberId, itnRecordId, dismissedBy: userId })
    .onConflictDoNothing();
}
