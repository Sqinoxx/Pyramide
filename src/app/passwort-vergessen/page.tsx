import { RequestResetForm } from "./RequestResetForm";

export default function RequestPasswordResetPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Passwort vergessen
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Gib deine E-Mail-Adresse ein, wir schicken dir einen Link zum
        Zurücksetzen.
      </p>
      <RequestResetForm />
    </div>
  );
}
