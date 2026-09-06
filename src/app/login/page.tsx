import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Anmelden</h1>
      <LoginForm callbackUrl={callbackUrl ?? "/profil"} />
      <div className="mt-6 flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/passwort-vergessen" className="underline">
          Passwort vergessen?
        </Link>
        <p>
          Noch kein Konto?{" "}
          <Link href="/register" className="font-medium underline">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
