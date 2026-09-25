"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { CheckboxField, FormError, FormSuccess, SubmitButton } from "@/components/form";
import {
  BOOLEAN_SETTING_FIELDS,
  NUMERIC_SETTING_FIELDS,
  numericSettingBounds,
  type DivisionSettings,
} from "@/lib/settings";

const GROUPS = [
  { key: "fordern", title: "Fordern" },
  { key: "fristen", title: "Fristen" },
  { key: "inaktivitaet", title: "Inaktivität" },
  { key: "mindestspiele", title: "Mindestspiele" },
] as const;

export function SettingsForm({
  divisionId,
  divisionName,
  settings,
  hasActiveSeason,
}: {
  divisionId: string;
  divisionName: string;
  settings: DivisionSettings;
  hasActiveSeason: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="divisionId" value={divisionId} />

      {GROUPS.map((group) => (
        <fieldset key={group.key} className="flex flex-col gap-3">
          <legend className="section-title mb-2">{group.title}</legend>

          {BOOLEAN_SETTING_FIELDS.filter((f) => f.group === group.key).map((f) => (
            <div key={f.key}>
              <CheckboxField
                label={f.label}
                name={f.key}
                id={`${divisionId}-${f.key}`}
                defaultChecked={settings[f.key]}
              />
              {f.help && (
                <p className="hint -mt-1 ml-8">{f.help}</p>
              )}
            </div>
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            {NUMERIC_SETTING_FIELDS.filter((f) => f.group === group.key).map((f) => {
              const { min, max } = numericSettingBounds(f.key);
              const id = `${divisionId}-${f.key}`;
              const error = state.fieldErrors?.[f.key];
              return (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label htmlFor={id} className="label">
                    {f.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={id}
                      name={f.key}
                      type="number"
                      inputMode="numeric"
                      min={min}
                      max={max}
                      step={1}
                      required
                      defaultValue={settings[f.key]}
                      aria-invalid={error ? true : undefined}
                      className="input w-24"
                    />
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{f.unit}</span>
                  </div>
                  {f.help && <p className="hint">{f.help}</p>}
                  {error && <p className="field-error">{error}</p>}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        {hasActiveSeason ? (
          <CheckboxField
            label="Sofort für die laufende Saison übernehmen"
            name="applyToActiveSeason"
            id={`${divisionId}-applyToActiveSeason`}
            defaultChecked
          />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Keine aktive Saison – die Werte gelten ab der nächsten {divisionName}-Saison.
          </p>
        )}
        <SubmitButton className="self-start">
          {pending ? "Wird gespeichert…" : "Einstellungen speichern"}
        </SubmitButton>
        {state.error && <FormError message={state.error} />}
        {state.success && !pending && <FormSuccess message="Einstellungen gespeichert." />}
      </div>
    </form>
  );
}
