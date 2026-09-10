import { parseDelimitedWithHeader } from "./csv-parse";
import { normalizeName } from "./itn-match";

/**
 * Parses the admin-supplied club roster (PLAN.md follow-up: UTC Neukirchen
 * already has real member accounts elsewhere — the pyramid doesn't try to
 * integrate with that system directly, it just checks new sign-ups against
 * an admin-imported export of it). Deliberately the same shape as
 * itn-import-parse.ts — CSV/TSV, loose header matching — just simpler,
 * since a membership roster only needs a name plus optionally birth year
 * and email.
 */

const HEADER_ALIASES: Record<string, string[]> = {
  lastName: ["nachname", "name", "familienname"],
  firstName: ["vorname"],
  birthYear: ["jahrgang", "geburtsjahr", "jg", "jg.", "geb"],
  email: ["email", "e-mail", "mail"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof typeof HEADER_ALIASES, string>> {
  const map: Partial<Record<string, string>> = {};
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const match = normalizedHeaders.find((h) => aliases.includes(h.norm));
    if (match) map[field] = match.raw;
  }
  return map;
}

export type ParsedClubMemberRow = {
  lastName: string;
  firstName: string;
  birthYear: number | null;
  email: string | null;
  normalizedName: string;
};

export type ParseError = { rowNumber: number; message: string };

export type ParseClubImportResult = {
  headerFound: Partial<Record<keyof typeof HEADER_ALIASES, string>>;
  rows: ParsedClubMemberRow[];
  errors: ParseError[];
};

export function parseClubImport(text: string): ParseClubImportResult {
  const { headers, rows } = parseDelimitedWithHeader(text);
  const headerMap = buildHeaderMap(headers);
  const errors: ParseError[] = [];
  const parsed: ParsedClubMemberRow[] = [];

  if (!headerMap.lastName || !headerMap.firstName) {
    errors.push({
      rowNumber: 0,
      message:
        "Spalten für Nachname/Vorname wurden nicht erkannt. Erwartet werden z. B. \"Nachname\" und \"Vorname\".",
    });
    return { headerFound: headerMap, rows: [], errors };
  }

  rows.forEach((row, i) => {
    const rowNumber = i + 2;
    const lastName = row[headerMap.lastName!]?.trim();
    const firstName = row[headerMap.firstName!]?.trim();

    if (!lastName || !firstName) {
      errors.push({ rowNumber, message: "Nachname oder Vorname fehlt." });
      return;
    }

    const birthYearRaw = headerMap.birthYear ? row[headerMap.birthYear]?.trim() : "";
    const birthYear = birthYearRaw ? Number(birthYearRaw) : null;
    if (birthYearRaw && Number.isNaN(birthYear)) {
      errors.push({ rowNumber, message: `Ungültiges Geburtsjahr: "${birthYearRaw}"` });
      return;
    }

    const email = headerMap.email ? row[headerMap.email]?.trim().toLowerCase() || null : null;

    parsed.push({
      lastName,
      firstName,
      birthYear: birthYear || null,
      email,
      normalizedName: normalizeName(lastName, firstName),
    });
  });

  return { headerFound: headerMap, rows: parsed, errors };
}
