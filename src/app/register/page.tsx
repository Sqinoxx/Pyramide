import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Registrieren
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Nach der Bestätigung deiner E-Mail-Adresse prüft ein Admin deine
        Registrierung, bevor du in die Pyramide aufgenommen wirst.
      </p>
      <RegisterForm />
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Schon registriert?{" "}
        <Link href="/login" className="font-medium underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
