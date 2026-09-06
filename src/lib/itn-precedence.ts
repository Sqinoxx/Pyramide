/**
 * Resolves the *active* ITN value for a member from the append-only
 * member_itn ladder, per PLAN.md §5.4: import > admin > self. A self entry is
 * never deleted when a higher-precedence entry arrives — it stays in the
 * table (superseded_at stays null on the self row; it just stops being the
 * active one) so the badge and the mismatch check in resolveItnBadge can
 * still compare against it.
 */

export type ItnSource = "import" | "admin" | "self";

export type ItnEntry = {
  source: ItnSource;
  value: number;
  asOf: Date;
  supersededAt: Date | null;
};

const PRECEDENCE: Record<ItnSource, number> = { import: 3, admin: 2, self: 1 };

export type ActiveItn = {
  value: number;
  source: ItnSource;
  asOf: Date;
  /** Present when a lower-precedence self-entry disagrees by more than one
   *  ITN step from the active value — surfaced to the admin dashboard. */
  mismatchWithSelf?: { selfValue: number; delta: number };
};

export function resolveActiveItn(entries: ItnEntry[]): ActiveItn | null {
  const active = entries.filter((e) => e.supersededAt === null);
  if (active.length === 0) return null;

  const best = active.reduce((a, b) =>
    PRECEDENCE[b.source] > PRECEDENCE[a.source] ? b : a,
  );

  const result: ActiveItn = {
    value: best.value,
    source: best.source,
    asOf: best.asOf,
  };

  if (best.source !== "self") {
    const selfEntry = active.find((e) => e.source === "self");
    if (selfEntry) {
      const delta = Math.abs(selfEntry.value - best.value);
      if (delta > 1) {
        result.mismatchWithSelf = { selfValue: selfEntry.value, delta };
      }
    }
  }

  return result;
}

export function formatItnBadge(active: ActiveItn, divisionLabel?: string): string {
  const value = active.value.toFixed(1);
  switch (active.source) {
    case "import":
      return `ITN ${value} · OÖTV${divisionLabel ? ` ${divisionLabel}` : ""}`;
    case "admin":
      return `ITN ${value} · vom Verein bestätigt`;
    case "self":
      return `ITN ${value} · eigene Angabe`;
  }
}
