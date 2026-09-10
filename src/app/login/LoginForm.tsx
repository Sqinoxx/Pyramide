"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestMagicLoginAction, adminLoginAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/form";

function MagicLoginForm() {
  const [state, formAction, pending] = useActionState(requestMagicLoginAction, initialActionState);

  if (state.success) {
    return (
      <FormSuccess message="Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Login-Link geschickt." />
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <SubmitButton>{pending ? "Wird gesendet…" : "Login-Link anfordern"}</SubmitButton>
    </form>
  );
}

function AdminLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FormError message={state.error} />
      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <Field
        label="Passwort"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <SubmitButton>{pending ? "Wird geprüft…" : "Mit Passwort anmelden"}</SubmitButton>
      <Link href="/passwort-vergessen" className="text-xs text-zinc-500 underline dark:text-zinc-400">
        Passwort vergessen?
      </Link>
    </form>
  );
}

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <MagicLoginForm />

      {showAdmin ? (
        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <AdminLoginForm callbackUrl={callbackUrl} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdmin(true)}
          className="text-xs text-zinc-400 underline dark:text-zinc-500"
        >
          Admin-Login mit Passwort
        </button>
      )}
    </div>
  );
}
