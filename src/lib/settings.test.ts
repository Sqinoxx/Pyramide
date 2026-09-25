import { describe, expect, it } from "vitest";
import {
  BOOLEAN_SETTING_FIELDS,
  DEFAULT_DIVISION_SETTINGS,
  NUMERIC_SETTING_FIELDS,
  divisionSettingsSchema,
  numericSettingBounds,
} from "./settings";

describe("divisionSettingsSchema", () => {
  it("fills new fields when reading settings stored before they existed", () => {
    const old = { challengeRowRange: 3, inactivityWeeks: 6 };
    const parsed = divisionSettingsSchema.parse(old);
    expect(parsed.challengeRowRange).toBe(3);
    expect(parsed.challengesPaused).toBe(false);
    expect(parsed.inactivityEnabled).toBe(true);
    expect(parsed.inactivityGraceWeeks).toBe(1);
    expect(parsed.inactivityCountFrom).toBeNull();
  });

  it("revives inactivityCountFrom from its JSON string form", () => {
    const stored = JSON.parse(
      JSON.stringify({ ...DEFAULT_DIVISION_SETTINGS, inactivityCountFrom: new Date("2026-03-01") }),
    );
    const parsed = divisionSettingsSchema.parse(stored);
    expect(parsed.inactivityCountFrom).toEqual(new Date("2026-03-01"));
  });

  it("rejects out-of-range values", () => {
    expect(divisionSettingsSchema.safeParse({ acceptDeadlineDays: 0 }).success).toBe(false);
    expect(divisionSettingsSchema.safeParse({ inactivityGraceWeeks: 13 }).success).toBe(false);
  });
});

describe("setting field metadata", () => {
  it("exposes bounds matching the schema", () => {
    expect(numericSettingBounds("challengeRowRange")).toEqual({ min: 1, max: 10 });
    expect(numericSettingBounds("rematchCooldownDays")).toEqual({ min: 0, max: 90 });
  });

  it("covers every field with a matching value type, and each only once", () => {
    const keys = [...NUMERIC_SETTING_FIELDS, ...BOOLEAN_SETTING_FIELDS].map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const { key } of NUMERIC_SETTING_FIELDS) {
      expect(typeof DEFAULT_DIVISION_SETTINGS[key]).toBe("number");
    }
    for (const { key } of BOOLEAN_SETTING_FIELDS) {
      expect(typeof DEFAULT_DIVISION_SETTINGS[key]).toBe("boolean");
    }
  });
});
