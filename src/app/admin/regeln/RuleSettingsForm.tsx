"use client";

import { useActionState } from "react";
import { saveRuleSettingsAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/form";
import type { DivisionSettings } from "@/lib/settings";

const GROUPS: { title: string; fields: { name: keyof DivisionSettings; label: string }[] }[] = [
  {
    title: "Fristen für Forderungen",
    fields: [
      { name: "acceptDeadlineDays", label: "Annahme der Forderung (Tage)" },
      { name: "playDeadlineDays", label: "Austragung nach Annahme (Tage)" },
      { name: "reportConfirmDays", label: "Bestätigung des Ergebnisses (Tage)" },
    ],
  },
  {
    title: "Sperrfristen & Inaktivität",
    fields: [
      { name: "postMatchCooldownDays", label: "Sperrfrist nach einem Match (Tage)" },
      { name: "rematchCooldownDays", label: "Sperrfrist gleiche Paarung (Tage)" },
      { name: "inactivityWeeks", label: "Inaktivität bis Abstieg (Wochen)" },
    ],
  },
  {
    title: "Mindestspiele pro Jahr",
    fields: [
      { name: "minMatchesPerYear", label: "Mindestanzahl Spiele pro Jahr (0 = aus)" },
      { name: "minMatchesWarningDays", label: "Sanduhr ab … Tage vor Fristende" },
    ],
  },
];

export function RuleSettingsForm({ settings }: { settings: DivisionSettings }) {
  const [state, formAction, pending] = useActionState(saveRuleSettingsAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="card card-body flex flex-col gap-3">
          <legend className="sr-only">{group.title}</legend>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">{group.title}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((f) => (
              <Field
                key={f.name}
                name={f.name}
                label={f.label}
                type="number"
                required
                defaultValue={String(settings[f.name])}
                error={state.fieldErrors?.[f.name]}
              />
            ))}
          </div>
        </fieldset>
      ))}
      {state.error && <FormError message={state.error} />}
      {state.success && <FormSuccess message="Einstellungen gespeichert." />}
      <SubmitButton>{pending ? "Wird gespeichert…" : "Speichern"}</SubmitButton>
    </form>
  );
}
