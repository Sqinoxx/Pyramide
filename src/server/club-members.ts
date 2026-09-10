import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { clubMemberImports, clubMembers } from "@/db/schema";
import { parseClubImport, type ParseError } from "@/lib/club-import-parse";
import {
  scoreCandidate,
  classifyMatches,
  normalizeName,
  type ItnCandidate,
  type MemberQuery,
} from "@/lib/itn-match";

export type CreateClubImportResult = {
  importId: string | null;
  rowCount: number;
  errors: ParseError[];
};

export async function createClubMemberImport(
  source: "csv" | "paste",
  fileName: string | null,
  text: string,
  importedBy: string,
): Promise<CreateClubImportResult> {
  const { rows, errors } = parseClubImport(text);
  if (rows.length === 0) {
    return { importId: null, rowCount: 0, errors };
  }

  const [importRow] = await db
    .insert(clubMemberImports)
    .values({ source, fileName, importedBy, rowCount: rows.length })
    .returning();

  await db.insert(clubMembers).values(
    rows.map((r) => ({
      importId: importRow.id,
      lastName: r.lastName,
      firstName: r.firstName,
      birthYear: r.birthYear,
      email: r.email,
      normalizedName: r.normalizedName,
    })),
  );

  return { importId: importRow.id, rowCount: rows.length, errors };
}

export async function listClubMemberImports() {
  return db.query.clubMemberImports.findMany({
    orderBy: (t, { desc }) => [desc(t.importedAt)],
    limit: 20,
  });
}

export type ClubMemberMatch = {
  tier: "auto" | "suggest" | "none";
  candidates: (ItnCandidate & { score: number })[];
};

/**
 * Trigram search over the imported club roster (same technique as
 * src/server/itn-matching.ts) — the "is this really a club member" check
 * behind the join flow (src/server/join.ts). `gender`/`club` bonuses in
 * scoreCandidate() never apply here since the roster import doesn't carry
 * either field; birth year still does when the roster has it.
 */
export async function findClubMemberCandidates(query: MemberQuery): Promise<ClubMemberMatch> {
  const normalizedQuery = normalizeName(query.lastName, query.firstName);

  const rows = (await db.execute(sql`
    select id, last_name, first_name, birth_year, email,
           similarity(normalized_name, ${normalizedQuery}) as sim
    from club_members
    where normalized_name % ${normalizedQuery}
    order by sim desc
    limit 5
  `)) as unknown as Array<{
    id: string;
    last_name: string;
    first_name: string;
    birth_year: number | null;
    email: string | null;
    sim: number;
  }>;

  const candidates: ItnCandidate[] = rows.map((r) => ({
    itnRecordId: r.id,
    lastName: r.last_name,
    firstName: r.first_name,
    birthYear: r.birth_year,
    gender: null,
    club: null,
    similarity: r.sim,
  }));

  const scored = candidates.map((c) => scoreCandidate(query, c));
  return classifyMatches(scored);
}
