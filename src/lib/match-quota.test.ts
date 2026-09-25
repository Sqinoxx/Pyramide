import { describe, expect, it } from "vitest";
import { evaluateMatchQuota } from "./match-quota";

const anchor = new Date("2025-03-01T00:00:00Z");
const d = (s: string) => new Date(`${s}T12:00:00Z`);
const base = { anchor, required: 3, warningDays: 30 };

describe("evaluateMatchQuota", () => {
  it("is disabled when no matches are required", () => {
    expect(evaluateMatchQuota({ ...base, required: 0, now: d("2025-06-01"), matchDates: [] })).toBeNull();
  });

  it("is ok early in the year even without matches", () => {
    const s = evaluateMatchQuota({ ...base, now: d("2025-06-01"), matchDates: [] });
    expect(s?.state).toBe("ok");
    expect(s?.deadline).toEqual(new Date("2026-03-01T00:00:00Z"));
  });

  it("warns within the last month before the deadline if short on matches", () => {
    const s = evaluateMatchQuota({ ...base, now: d("2026-02-10"), matchDates: [d("2025-05-01")] });
    expect(s).toMatchObject({ state: "warning", played: 1, required: 3 });
  });

  it("does not warn once the quota is met", () => {
    const matchDates = [d("2025-05-01"), d("2025-07-01"), d("2025-09-01")];
    expect(evaluateMatchQuota({ ...base, now: d("2026-02-10"), matchDates })?.state).toBe("ok");
  });

  it("stays overdue after the deadline until the admin acts", () => {
    const s = evaluateMatchQuota({
      ...base,
      now: d("2026-08-01"),
      matchDates: [d("2025-05-01"), d("2026-04-01"), d("2026-05-01"), d("2026-06-01")],
    });
    expect(s).toMatchObject({ state: "overdue", played: 1 });
    expect(s?.deadline).toEqual(new Date("2026-03-01T00:00:00Z"));
  });

  it("evaluates the new year once the previous one was fulfilled", () => {
    const matchDates = [d("2025-05-01"), d("2025-07-01"), d("2025-09-01")];
    const s = evaluateMatchQuota({ ...base, now: d("2026-04-01"), matchDates });
    expect(s).toMatchObject({ state: "ok", played: 0 });
    expect(s?.deadline).toEqual(new Date("2027-03-01T00:00:00Z"));
  });
});
