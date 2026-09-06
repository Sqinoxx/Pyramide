import "server-only";
import { db } from "@/db";
import { itnImports, itnRecords } from "@/db/schema";
import { parseItnImport, type ParseError } from "@/lib/itn-import-parse";

export type CreateImportResult = {
  importId: string | null;
  rowCount: number;
  errors: ParseError[];
};

export async function createItnImport(
  source: "csv" | "paste",
  fileName: string | null,
  text: string,
  importedBy: string,
): Promise<CreateImportResult> {
  const { rows, errors } = parseItnImport(text);
  if (rows.length === 0) {
    return { importId: null, rowCount: 0, errors };
  }

  const [importRow] = await db
    .insert(itnImports)
    .values({ source, fileName, importedBy, rowCount: rows.length })
    .returning();

  await db.insert(itnRecords).values(
    rows.map((r) => ({
      importId: importRow.id,
      lastName: r.lastName,
      firstName: r.firstName,
      birthYear: r.birthYear,
      gender: r.gender,
      club: r.club,
      region: r.region,
      licenceNo: r.licenceNo,
      itn: r.itn.toFixed(1),
      points: r.points,
      normalizedName: r.normalizedName,
      validFrom: new Date(),
    })),
  );

  return { importId: importRow.id, rowCount: rows.length, errors };
}

export async function listItnImports() {
  return db.query.itnImports.findMany({
    orderBy: (t, { desc }) => [desc(t.importedAt)],
    limit: 20,
  });
}
