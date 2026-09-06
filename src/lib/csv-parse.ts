/**
 * Small RFC4180-ish delimited-text parser for the ITN import (PLAN.md §5.1):
 * admin-supplied CSV/TSV, either a real file upload or pasted straight out
 * of a spreadsheet or the OÖTV table in a browser. No external dependency —
 * the format is simple enough (quoted fields, one delimiter) that a
 * hand-rolled parser is less risk than pulling in a library for it.
 */

export function detectDelimiter(sampleLine: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const c of candidates) {
    const count = sampleLine.split(c).length;
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  return best;
}

/** Parses one delimited-text blob into rows of string cells. Handles quoted
 * fields (with escaped `""`) and both \n and \r\n line endings. */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = normalized.slice(0, normalized.indexOf("\n") + 1 || undefined);
  const delim = delimiter ?? detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];

    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // Flush the last field/row if the text didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map((r) => r.map((cell) => cell.trim()))
    .filter((r) => r.some((cell) => cell.length > 0));
}

export type DelimitedTable = { headers: string[]; rows: Record<string, string>[] };

/** Parses with the first row as a header, returning objects keyed by header. */
export function parseDelimitedWithHeader(text: string, delimiter?: string): DelimitedTable {
  const rows = parseDelimited(text, delimiter);
  if (rows.length === 0) return { headers: [], rows: [] };
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => h.trim());
  return {
    headers,
    rows: dataRows.map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    }),
  };
}
