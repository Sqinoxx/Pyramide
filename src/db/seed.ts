import "dotenv/config";
import { db } from "./index";
import {
  users,
  members,
  divisions,
  seasons,
  positions,
  memberItn,
  itnImports,
  itnRecords,
  itnLinks,
} from "./schema";
import { hashPassword } from "@/lib/password";
import { normalizeName } from "@/lib/itn-match";
import { seedPyramid, type SeedEntry } from "@/lib/pyramid";
import { DEFAULT_DIVISION_SETTINGS } from "@/lib/settings";
import { eq } from "drizzle-orm";

/**
 * Seed script for local/dev environments: creates the two divisions, an
 * admin account, a mock OÖTV ITN import, and ~40 test members (split across
 * Herren/Damen) seeded into a fresh active season each. Safe to re-run
 * against an empty database; NOT idempotent against a populated one (it will
 * throw on unique-constraint violations) — that's intentional, this is
 * throwaway test data, not a fixture to be reconciled.
 */

const HERREN_NAMES: Array<[string, string, number]> = [
  ["Gruber", "Michael", 1988],
  ["Huber", "Thomas", 1991],
  ["Bauer", "Florian", 1985],
  ["Wagner", "Lukas", 1995],
  ["Pichler", "Simon", 1990],
  ["Steiner", "Daniel", 1993],
  ["Moser", "Christoph", 1987],
  ["Berger", "Andreas", 1982],
  ["Fuchs", "Markus", 1997],
  ["Mayer", "Stefan", 1989],
  ["Winkler", "Johannes", 1994],
  ["Weber", "Patrick", 1992],
  ["Schmid", "Alexander", 1986],
  ["Leitner", "Bernhard", 1983],
  ["Wolf", "Manuel", 1998],
  ["Hofer", "Georg", 1990],
  ["Aigner", "Martin", 1984],
  ["Egger", "Fabian", 1996],
  ["Brunner", "Dominik", 1991],
  ["Lang", "Raphael", 1999],
  ["Baumgartner", "Julian", 1993],
  ["Wimmer", "Sebastian", 1988],
  ["Schwarz", "Felix", 2000],
  ["Auer", "Niklas", 1995],
  ["Wieser", "Paul", 1997],
];

const DAMEN_NAMES: Array<[string, string, number]> = [
  ["Gruber", "Anna", 1993],
  ["Huber", "Lena", 1996],
  ["Bauer", "Sarah", 1990],
  ["Wagner", "Julia", 1994],
  ["Pichler", "Laura", 1998],
  ["Steiner", "Nina", 1989],
  ["Moser", "Katharina", 1992],
  ["Berger", "Sophie", 1997],
  ["Fuchs", "Lisa", 1991],
  ["Mayer", "Verena", 1995],
  ["Winkler", "Christina", 1987],
  ["Weber", "Elena", 1999],
  ["Schmid", "Marlene", 1993],
  ["Leitner", "Theresa", 2000],
  ["Wolf", "Carina", 1996],
];

async function upsertDivision(key: "herren" | "damen", name: string) {
  const existing = await db.query.divisions.findFirst({
    where: eq(divisions.key, key),
  });
  if (existing) return existing;
  const [row] = await db
    .insert(divisions)
    .values({ key, name, settings: DEFAULT_DIVISION_SETTINGS })
    .returning();
  return row;
}

async function main() {
  console.log("[seed] creating divisions…");
  const herren = await upsertDivision("herren", "Herren");
  const damen = await upsertDivision("damen", "Damen");

  console.log("[seed] creating admin account…");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";
  let admin = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (!admin) {
    [admin] = await db
      .insert(users)
      .values({
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        emailVerifiedAt: new Date(),
        role: "admin",
      })
      .returning();
  }
  const adminId = admin.id;

  console.log("[seed] creating a mock OÖTV ITN import…");
  const [importRow] = await db
    .insert(itnImports)
    .values({ source: "csv", fileName: "seed-fixture.csv", importedBy: adminId, rowCount: 10 })
    .returning();

  // A handful of official-looking ITN records so the matching flow (§5.2) has
  // something real to find during manual testing. Deliberately overlaps a
  // few of the seeded members' names.
  const mockRecords = [
    { lastName: "Gruber", firstName: "Michael", birthYear: 1988, gender: "m" as const, club: "UTC Pyramide", itn: "3.5" },
    { lastName: "Huber", firstName: "Thomas", birthYear: 1991, gender: "m" as const, club: "UTC Pyramide", itn: "4.0" },
    { lastName: "Bauer", firstName: "Florian", birthYear: 1985, gender: "m" as const, club: "UTC Pyramide", itn: "2.5" },
    { lastName: "Gruber", firstName: "Anna", birthYear: 1993, gender: "w" as const, club: "UTC Pyramide", itn: "3.0" },
    { lastName: "Huber", firstName: "Lena", birthYear: 1996, gender: "w" as const, club: "UTC Pyramide", itn: "4.5" },
  ];
  const insertedRecords = await db
    .insert(itnRecords)
    .values(
      mockRecords.map((r) => ({
        importId: importRow.id,
        lastName: r.lastName,
        firstName: r.firstName,
        birthYear: r.birthYear,
        gender: r.gender,
        club: r.club,
        region: "OÖ",
        itn: r.itn,
        normalizedName: normalizeName(r.lastName, r.firstName),
        validFrom: new Date(),
      })),
    )
    .returning();

  async function seedDivisionMembers(
    divisionId: string,
    gender: "m" | "w",
    names: Array<[string, string, number]>,
    emailPrefix: string,
  ) {
    const memberRows: { id: string; itn: number | null }[] = [];
    for (let i = 0; i < names.length; i++) {
      const [lastName, firstName, birthYear] = names[i];
      const email = `${emailPrefix}${i + 1}@example.com`;
      const [user] = await db
        .insert(users)
        .values({
          email,
          passwordHash: await hashPassword("testpass123"),
          emailVerifiedAt: new Date(),
          role: "member",
        })
        .returning();

      const [member] = await db
        .insert(members)
        .values({
          userId: user.id,
          firstName,
          lastName,
          birthYear,
          gender,
          club: "UTC Pyramide",
          divisionId,
          status: "active",
          joinedAt: new Date(),
          normalizedName: normalizeName(lastName, firstName),
        })
        .returning();

      // Every 4th member gets a self-reported ITN instead of an official
      // match, to exercise the precedence logic (§5.4) in the seeded data.
      const selfReportsItn = i % 4 === 3;
      let itnValue: number | null = null;

      const matchedRecord = insertedRecords.find(
        (r) => r.lastName === lastName && r.firstName === firstName,
      );

      if (matchedRecord && !selfReportsItn) {
        await db.insert(itnLinks).values({
          memberId: member.id,
          itnRecordId: matchedRecord.id,
          confidence: "1.000",
          confirmedBy: user.id,
          confirmedAt: new Date(),
        });
        await db.insert(memberItn).values({
          memberId: member.id,
          source: "import",
          value: matchedRecord.itn,
          asOf: matchedRecord.validFrom,
          createdBy: adminId,
        });
        itnValue = Number(matchedRecord.itn);
      } else if (selfReportsItn) {
        // Plausible self-entry, roughly ITN 3.0-8.0.
        const guess = (3 + ((i * 7) % 10) / 2).toFixed(1);
        await db.insert(memberItn).values({
          memberId: member.id,
          source: "self",
          value: guess,
          asOf: new Date(),
          createdBy: user.id,
        });
        itnValue = Number(guess);
      }

      memberRows.push({ id: member.id, itn: itnValue });
    }
    return memberRows;
  }

  console.log("[seed] creating Herren members…");
  const herrenMembers = await seedDivisionMembers(herren.id, "m", HERREN_NAMES, "herr");
  console.log("[seed] creating Damen members…");
  const damenMembers = await seedDivisionMembers(damen.id, "w", DAMEN_NAMES, "dame");

  async function seedSeason(divisionId: string, name: string, memberRows: { id: string; itn: number | null }[]) {
    const [season] = await db
      .insert(seasons)
      .values({
        divisionId,
        name,
        startsAt: new Date(),
        status: "active",
        settings: DEFAULT_DIVISION_SETTINGS,
      })
      .returning();

    const entries: SeedEntry[] = memberRows.map((m, i) => ({
      memberId: m.id,
      itn: m.itn,
      tiebreak: i, // stable order for members without an ITN (registration order)
    }));
    const assignment = seedPyramid(entries);

    await db.insert(positions).values(
      Array.from(assignment.entries()).map(([memberId, pos]) => ({
        seasonId: season.id,
        memberId,
        row: pos.row,
        slot: pos.slot,
      })),
    );

    return season;
  }

  console.log("[seed] seeding Herren-Pyramide…");
  await seedSeason(herren.id, "Saison 2026", herrenMembers);
  console.log("[seed] seeding Damen-Pyramide…");
  await seedSeason(damen.id, "Saison 2026", damenMembers);

  console.log("\n[seed] done.");
  console.log(`  Admin login: ${adminEmail} / ${adminPassword}`);
  console.log(`  Member logins: herr1..herr${HERREN_NAMES.length}@example.com / testpass123`);
  console.log(`  Member logins: dame1..dame${DAMEN_NAMES.length}@example.com / testpass123`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed", err);
    process.exit(1);
  });
