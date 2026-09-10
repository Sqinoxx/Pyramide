import { describe, it, expect } from "vitest";
import { maxDate } from "./dates";

describe("maxDate", () => {
  it("returns the latest of several dates", () => {
    const a = new Date("2026-01-01");
    const b = new Date("2026-03-01");
    const c = new Date("2026-02-01");
    expect(maxDate(a, b, c)).toEqual(b);
  });

  it("ignores null and undefined entries", () => {
    const a = new Date("2026-01-01");
    expect(maxDate(null, a, undefined)).toEqual(a);
  });

  it("throws when every date is missing — callers must supply a guaranteed baseline", () => {
    expect(() => maxDate(null, undefined)).toThrow();
  });
});
