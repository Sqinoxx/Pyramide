import { describe, it, expect } from "vitest";
import { parseClubImport } from "./club-import-parse";

describe("parseClubImport", () => {
  it("parses a well-formed roster CSV", () => {
    const csv = "Nachname,Vorname,Jahrgang,E-Mail\nGruber,Michael,1988,michael@example.com";
    const result = parseClubImport(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        lastName: "Gruber",
        firstName: "Michael",
        birthYear: 1988,
        email: "michael@example.com",
        normalizedName: "gruber, michael",
      },
    ]);
  });

  it("works with only name columns (no birth year or email)", () => {
    const csv = "Nachname,Vorname\nHuber,Anna";
    const result = parseClubImport(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ lastName: "Huber", firstName: "Anna", birthYear: null, email: null });
  });

  it("reports a row-level error for a missing name without dropping other rows", () => {
    const csv = "Nachname,Vorname\nGruber,Michael\n,Peter";
    const result = parseClubImport(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/Nachname oder Vorname fehlt/);
  });

  it("fails fast when name columns are missing", () => {
    const csv = "Foo,Bar\n1,2";
    const result = parseClubImport(csv);
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toMatch(/Nachname\/Vorname/);
  });
});
