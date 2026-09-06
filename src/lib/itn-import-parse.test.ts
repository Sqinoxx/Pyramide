import { describe, it, expect } from "vitest";
import { parseItnImport } from "./itn-import-parse";

describe("parseItnImport", () => {
  it("parses a well-formed CSV with German headers", () => {
    const csv =
      "Nachname,Vorname,Jahrgang,Geschlecht,Verein,ITN\n" +
      "Gruber,Michael,1988,m,UTC Pyramide,3.5\n" +
      "Huber,Anna,1993,w,UTC Pyramide,4.5";
    const result = parseItnImport(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      lastName: "Gruber",
      firstName: "Michael",
      birthYear: 1988,
      gender: "m",
      club: "UTC Pyramide",
      itn: 3.5,
      normalizedName: "gruber, michael",
    });
  });

  it("recognizes alternate header spellings and a comma as decimal separator", () => {
    const csv = "Name;Vorname;ITN Austria\nMayer;Stefan;5,5";
    const result = parseItnImport(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].itn).toBe(5.5);
  });

  it("reports a row-level error for an invalid ITN value without dropping other rows", () => {
    const csv = "Nachname,Vorname,ITN\nGut,Peter,4.0\nSchlecht,Erika,99";
    const result = parseItnImport(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].lastName).toBe("Gut");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/Ungültiger ITN-Wert/);
    expect(result.errors[0].rowNumber).toBe(3);
  });

  it("reports a row-level error for a missing name", () => {
    const csv = "Nachname,Vorname,ITN\n,Peter,4.0";
    const result = parseItnImport(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toMatch(/Nachname oder Vorname fehlt/);
  });

  it("fails fast with a clear error when required columns are missing", () => {
    const csv = "Foo,Bar\n1,2";
    const result = parseItnImport(csv);
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toMatch(/Nachname\/Vorname/);
  });

  it("fails fast when the ITN column is missing", () => {
    const csv = "Nachname,Vorname\nGruber,Michael";
    const result = parseItnImport(csv);
    expect(result.errors[0].message).toMatch(/ITN wurde nicht erkannt/);
  });
});
