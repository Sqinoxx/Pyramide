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
  // Winterpause etc.: no new challenges and the inactivity clock stands
  // still. Challenges that are already open keep running normally.
  challengesPaused: z.boolean().default(false),
  inactivityEnabled: z.boolean().default(true),
  inactivityGraceWeeks: z.number().int().min(0).max(12).default(1),
  // Not admin-editable: stamped when a pause ends (or the admin resets the
  // counter) so the inactivity job never counts time before it.
  inactivityCountFrom: z.coerce.date().nullable().default(null),
  // Mindestanzahl an Spielen pro Jahr (0 = Regel aus). Nicht erreicht →
  // Sanduhr in der Pyramide, danach entfernt der Admin manuell.
  minMatchesPerYear: z.number().int().min(0).max(52).default(0),
  minMatchesWarningDays: z.number().int().min(1).max(180).default(30),
});

export type DivisionSettings = z.infer<typeof divisionSettingsSchema>;

export const DEFAULT_DIVISION_SETTINGS: DivisionSettings =
  divisionSettingsSchema.parse({});

type NumericKey = {
  [K in keyof DivisionSettings]: DivisionSettings[K] extends number ? K : never;
}[keyof DivisionSettings];
type BooleanKey = {
  [K in keyof DivisionSettings]: DivisionSettings[K] extends boolean ? K : never;
}[keyof DivisionSettings];

export type SettingGroup = "fordern" | "fristen" | "inaktivitaet" | "mindestspiele";

/**
 * Admin-editable subset of the settings, with labels for the settings form
 * (src/app/admin/einstellungen). maxOpenOutgoing/-Incoming are deliberately
 * missing: the partial unique indexes in drizzle/0001 pin them to 1.
 */
export const NUMERIC_SETTING_FIELDS: {
  key: NumericKey;
  group: SettingGroup;
  label: string;
  unit: string;
  help?: string;
}[] = [
  {
    key: "challengeRowRange",
    group: "fordern",
    label: "Forderungsreichweite",
    unit: "Reihen",
    help: "Wie viele Reihen nach oben gefordert werden darf.",
  },
  {
    key: "rematchCooldownDays",
    group: "fordern",
    label: "Sperrfrist gleiche Paarung",
    unit: "Tage",
    help: "Bis dieselben zwei Personen erneut gegeneinander antreten dürfen.",
  },
  {
    key: "postMatchCooldownDays",
    group: "fordern",
    label: "Sperrfrist nach einem Match",
    unit: "Tage",
    help: "Schonfrist, in der man nach einem Match nicht gefordert werden kann.",
  },
  { key: "acceptDeadlineDays", group: "fristen", label: "Frist zur Annahme", unit: "Tage" },
  { key: "playDeadlineDays", group: "fristen", label: "Frist zur Austragung", unit: "Tage" },
  {
    key: "reportConfirmDays",
    group: "fristen",
    label: "Frist zur Ergebnisbestätigung",
    unit: "Tage",
    help: "Danach gilt ein gemeldetes Ergebnis automatisch als bestätigt.",
  },
  {
    key: "inactivityWeeks",
    group: "inaktivitaet",
    label: "Inaktiv nach",
    unit: "Wochen",
    help: "Ohne Match in dieser Zeit gibt es eine Verwarnung.",
  },
  {
    key: "inactivityGraceWeeks",
    group: "inaktivitaet",
    label: "Nachfrist nach Verwarnung",
    unit: "Wochen",
    help: "Danach rutscht man eine Position nach unten.",
  },
  {
    key: "minMatchesPerYear",
    group: "mindestspiele",
    label: "Mindestspiele pro Jahr",
    unit: "Spiele",
    help: "0 = Regel aus. Das Jahr zählt ab dem Eintritt in die Pyramide.",
  },
  {
    key: "minMatchesWarningDays",
    group: "mindestspiele",
    label: "Sanduhr vor Fristende",
    unit: "Tage",
    help: "Ab dann erscheint bei fehlenden Spielen eine Sanduhr in der Pyramide.",
  },
];

export const BOOLEAN_SETTING_FIELDS: {
  key: BooleanKey;
  group: SettingGroup;
  label: string;
  help?: string;
}[] = [
  {
    key: "challengesPaused",
    group: "fordern",
    label: "Forderungen pausieren",
    help: "Z. B. Winterpause: keine neuen Forderungen, Inaktivität wird nicht gezählt.",
  },
  {
    key: "challengeSameRow",
    group: "fordern",
    label: "Forderung innerhalb der eigenen Reihe erlauben",
  },
  {
    key: "declineForfeit",
    group: "fordern",
    label: "Absage wertet als Niederlage",
    help: "Wer eine Forderung ablehnt, verliert kampflos (Walkover).",
  },
  {
    key: "inactivityEnabled",
    group: "inaktivitaet",
    label: "Inaktivitätsregel aktiv",
  },
];

/** Bounds straight from the zod schema, so the form can't drift from it. */
export function numericSettingBounds(key: NumericKey): { min: number; max: number } {
  const field = divisionSettingsSchema.shape[key];
  // .default() wraps the ZodNumber; unwrap to read its checks.
  const inner = field.unwrap() as z.ZodNumber;
  return { min: inner.minValue ?? 0, max: inner.maxValue ?? 999 };
}
