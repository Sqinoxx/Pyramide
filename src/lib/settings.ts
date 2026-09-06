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
});

export type DivisionSettings = z.infer<typeof divisionSettingsSchema>;

export const DEFAULT_DIVISION_SETTINGS: DivisionSettings =
  divisionSettingsSchema.parse({});
