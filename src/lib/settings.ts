import { z } from "zod";

/**
 * Regelparameter je Bewerb (PLAN.md §4.2). Persisted as `divisions.settings`
 * jsonb; validated with this schema on every admin write so a malformed
 * value can never reach the challenge engine.
 */
export const divisionSettingsSchema = z.object({
  challengeRowRange: z.number().int().min(1).max(10).default(2),
  challengeSameRow: z.boolean().default(true),
  acceptDeadlineDays: z.number().int().min(1).max(30).default(7),
  playDeadlineDays: z.number().int().min(1).max(90).default(21),
  reportConfirmDays: z.number().int().min(1).max(14).default(3),
  maxOpenOutgoing: z.number().int().min(1).max(1).default(1), // see drizzle/0001 caveat
  maxOpenIncoming: z.number().int().min(1).max(1).default(1),
  rematchCooldownDays: z.number().int().min(0).max(90).default(14),
  postMatchCooldownDays: z.number().int().min(0).max(30).default(3),
  inactivityWeeks: z.number().int().min(1).max(52).default(8),
  declineForfeit: z.boolean().default(true),
  // Mindestanzahl an Spielen pro Jahr (0 = Regel aus). Nicht erreicht →
  // Sanduhr in der Pyramide, danach entfernt der Admin manuell.
  minMatchesPerYear: z.number().int().min(0).max(52).default(0),
  minMatchesWarningDays: z.number().int().min(1).max(180).default(30),
});

/**
 * The subset of settings the admin edits on /admin/regeln. Everything else
 * (row range, open-challenge limits, …) stays at its default — changing
 * those mid-season would reshape the rules under running challenges.
 */
export const ADMIN_EDITABLE_SETTINGS = [
  "acceptDeadlineDays",
  "playDeadlineDays",
  "reportConfirmDays",
  "rematchCooldownDays",
  "postMatchCooldownDays",
  "inactivityWeeks",
  "minMatchesPerYear",
  "minMatchesWarningDays",
] as const satisfies readonly (keyof z.infer<typeof divisionSettingsSchema>)[];

export type DivisionSettings = z.infer<typeof divisionSettingsSchema>;

export const DEFAULT_DIVISION_SETTINGS: DivisionSettings =
  divisionSettingsSchema.parse({});
