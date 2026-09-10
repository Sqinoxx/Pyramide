import Link from "next/link";
import { JoinForm } from "./JoinForm";

export default function JoinPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Zur Pyramide anmelden
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Für Mitglieder von UTC Neukirchen. Kein Passwort nötig — nach dem
        Bestätigen deiner E-Mail-Adresse prüft ein Admin deine Anmeldung,
        bevor du in die Pyramide aufgenommen wirst.
      </p>
      <JoinForm />
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Schon angemeldet?{" "}
        <Link href="/login" className="font-medium underline">
          Login-Link anfordern
        </Link>
      </p>
    </div>
  );
}
