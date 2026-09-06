import { parseDelimitedWithHeader } from "./csv-parse";
import { normalizeName } from "./itn-match";

/**
 * Turns an admin-supplied CSV/TSV blob (file upload or pasted straight out
 * of a spreadsheet / the OÖTV table) into validated ITN records. Header
 * names are matched loosely (case-insensitive, several German synonyms)
 * since there's no single official export format — see PLAN.md §5.1.
 */

const HEADER_ALIASES: Record<string, string[]> = {
  lastName: ["nachname", "name", "familienname"],
  firstName: ["vorname"],
  birthYear: ["jahrgang", "geburtsjahr", "jg", "jg.", "geb"],
  gender: ["geschlecht", "gender"],
  club: ["verein", "club"],
  region: ["region", "lv", "bundesland"],
  licenceNo: ["lizenz", "lizenznummer", "licence", "license"],
  itn: ["itn", "itn austria"],
  points: ["punkte", "points"],
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

function parseGender(raw: string): "m" | "w" | null {
  const v = raw.trim().toLowerCase();
  if (["m", "männlich", "herren", "male"].includes(v)) return "m";
  if (["w", "weiblich", "damen", "female", "f"].includes(v)) return "w";
  return null;
}

export type ParsedItnRow = {
  lastName: string;
  firstName: string;
  birthYear: number | null;
  gender: "m" | "w" | null;
  club: string | null;
  region: string | null;
  licenceNo: string | null;
  itn: number;
  points: number | null;
  normalizedName: string;
};

export type ParseError = { rowNumber: number; message: string };

export type ParseItnImportResult = {
  headerFound: Partial<Record<keyof typeof HEADER_ALIASES, string>>;
  rows: ParsedItnRow[];
  errors: ParseError[];
};

const ITN_MIN = 1.0;
const ITN_MAX = 10.3;

export function parseItnImport(text: string): ParseItnImportResult {
  const { headers, rows } = parseDelimitedWithHeader(text);
  const headerMap = buildHeaderMap(headers);
  const errors: ParseError[] = [];
  const parsed: ParsedItnRow[] = [];

  if (!headerMap.lastName || !headerMap.firstName) {
    errors.push({
      rowNumber: 0,
      message:
        "Spalten für Nachname/Vorname wurden nicht erkannt. Erwartet werden z. B. \"Nachname\" und \"Vorname\".",
    });
    return { headerFound: headerMap, rows: [], errors };
  }
  if (!headerMap.itn) {
    errors.push({ rowNumber: 0, message: "Spalte für ITN wurde nicht erkannt." });
    return { headerFound: headerMap, rows: [], errors };
  }

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for 1-index, +1 for the header row
    const lastName = row[headerMap.lastName!]?.trim();
    const firstName = row[headerMap.firstName!]?.trim();
    const itnRaw = row[headerMap.itn!]?.trim();

    if (!lastName || !firstName) {
      errors.push({ rowNumber, message: "Nachname oder Vorname fehlt." });
      return;
    }

    const itn = Number(itnRaw?.replace(",", "."));
    if (!itnRaw || Number.isNaN(itn) || itn < ITN_MIN || itn > ITN_MAX) {
      errors.push({ rowNumber, message: `Ungültiger ITN-Wert: "${itnRaw}"` });
      return;
    }

    const birthYearRaw = headerMap.birthYear ? row[headerMap.birthYear]?.trim() : "";
    const birthYear = birthYearRaw ? Number(birthYearRaw) : null;
    if (birthYearRaw && Number.isNaN(birthYear)) {
      errors.push({ rowNumber, message: `Ungültiges Geburtsjahr: "${birthYearRaw}"` });
      return;
    }

    const pointsRaw = headerMap.points ? row[headerMap.points]?.trim() : "";
    const points = pointsRaw ? Number(pointsRaw) : null;

    parsed.push({
      lastName,
      firstName,
      birthYear: birthYear || null,
      gender: headerMap.gender ? parseGender(row[headerMap.gender] ?? "") : null,
      club: headerMap.club ? row[headerMap.club]?.trim() || null : null,
      region: headerMap.region ? row[headerMap.region]?.trim() || null : null,
      licenceNo: headerMap.licenceNo ? row[headerMap.licenceNo]?.trim() || null : null,
      itn,
      points: points && !Number.isNaN(points) ? points : null,
      normalizedName: normalizeName(lastName, firstName),
    });
  });

  return { headerFound: headerMap, rows: parsed, errors };
}
