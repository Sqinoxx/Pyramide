import { describe, it, expect } from "vitest";
import { detectDelimiter, parseDelimited, parseDelimitedWithHeader } from "./csv-parse";

describe("detectDelimiter", () => {
  it("detects comma", () => {
    expect(detectDelimiter("a,b,c")).toBe(",");
  });
  it("detects semicolon", () => {
    expect(detectDelimiter("a;b;c;d")).toBe(";");
  });
  it("detects tab", () => {
    expect(detectDelimiter("a\tb\tc\td\te")).toBe("\t");
  });
});

describe("parseDelimited", () => {
  it("parses a simple comma-separated table", () => {
    const result = parseDelimited("a,b,c\n1,2,3");
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields containing the delimiter", () => {
    const result = parseDelimited('Name,Club\n"Gruber, Michael",UTC');
    expect(result).toEqual([
      ["Name", "Club"],
      ["Gruber, Michael", "UTC"],
    ]);
  });

  it("handles escaped quotes inside a quoted field", () => {
    const result = parseDelimited('Name\n"Sepp ""der Boss"" Huber"');
    expect(result).toEqual([["Name"], ['Sepp "der Boss" Huber']]);
  });

  it("skips blank lines", () => {
    const result = parseDelimited("a,b\n\n1,2\n");
    expect(result).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles CRLF line endings", () => {
    const result = parseDelimited("a,b\r\n1,2\r\n");
    expect(result).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("auto-detects a tab-separated paste from a spreadsheet", () => {
    const result = parseDelimited("Nachname\tVorname\tITN\nGruber\tMichael\t3.5");
    expect(result).toEqual([
      ["Nachname", "Vorname", "ITN"],
      ["Gruber", "Michael", "3.5"],
    ]);
  });
});

describe("parseDelimitedWithHeader", () => {
  it("returns rows keyed by header name", () => {
    const { headers, rows } = parseDelimitedWithHeader(
      "Nachname,Vorname,ITN\nGruber,Michael,3.5\nHuber,Thomas,4.0",
    );
    expect(headers).toEqual(["Nachname", "Vorname", "ITN"]);
    expect(rows).toEqual([
      { Nachname: "Gruber", Vorname: "Michael", ITN: "3.5" },
      { Nachname: "Huber", Vorname: "Thomas", ITN: "4.0" },
    ]);
  });

  it("returns empty result for empty input", () => {
    expect(parseDelimitedWithHeader("")).toEqual({ headers: [], rows: [] });
  });
});
