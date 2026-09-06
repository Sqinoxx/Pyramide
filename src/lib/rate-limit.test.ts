import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, _resetRateLimitsForTests } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetRateLimitsForTests();
    vi.useRealTimers();
  });

  it("allows up to the limit within a window", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("k", 5, 60_000)).toEqual({ allowed: true });
    }
  });

  it("blocks once the limit is exceeded", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("k", 5, 60_000);
    const result = checkRateLimit("k", 5, 60_000);
    expect(result.allowed).toBe(false);
  });

  it("tracks separate keys independently", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("a", 5, 60_000);
    expect(checkRateLimit("b", 5, 60_000)).toEqual({ allowed: true });
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 3; i++) checkRateLimit("k", 3, 1000);
    expect(checkRateLimit("k", 3, 1000).allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit("k", 3, 1000).allowed).toBe(true);
  });
});
