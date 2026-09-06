import { describe, it, expect } from "vitest";
import { resolveActiveItn } from "./itn-precedence";

const asOf = new Date("2026-01-01");

describe("resolveActiveItn", () => {
  it("returns null when there is no data", () => {
    expect(resolveActiveItn([])).toBeNull();
  });

  it("prefers import over admin over self", () => {
    const entries = [
      { source: "self" as const, value: 5, asOf, supersededAt: null },
      { source: "admin" as const, value: 4, asOf, supersededAt: null },
      { source: "import" as const, value: 3.5, asOf, supersededAt: null },
    ];
    expect(resolveActiveItn(entries)?.value).toBe(3.5);
    expect(resolveActiveItn(entries)?.source).toBe("import");
  });

  it("falls back to self when nothing else is present", () => {
    const entries = [{ source: "self" as const, value: 6, asOf, supersededAt: null }];
    const active = resolveActiveItn(entries);
    expect(active?.source).toBe("self");
    expect(active?.value).toBe(6);
  });

  it("ignores superseded entries", () => {
    const entries = [
      { source: "self" as const, value: 6, asOf, supersededAt: new Date() },
    ];
    expect(resolveActiveItn(entries)).toBeNull();
  });

  it("flags a mismatch when the self entry disagrees by more than one step", () => {
    const entries = [
      { source: "self" as const, value: 6, asOf, supersededAt: null },
      { source: "import" as const, value: 3.5, asOf, supersededAt: null },
    ];
    const active = resolveActiveItn(entries);
    expect(active?.mismatchWithSelf).toEqual({ selfValue: 6, delta: 2.5 });
  });

  it("does not flag a mismatch within one ITN step", () => {
    const entries = [
      { source: "self" as const, value: 4, asOf, supersededAt: null },
      { source: "import" as const, value: 3.5, asOf, supersededAt: null },
    ];
    expect(resolveActiveItn(entries)?.mismatchWithSelf).toBeUndefined();
  });
});
