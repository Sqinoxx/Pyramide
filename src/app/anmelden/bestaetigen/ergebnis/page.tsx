import Link from "next/link";

/**
 * Reached only on failure — a successful confirm redirects straight to
 * /profil via signIn()'s redirectTo. Auth.js's Credentials provider only
 * ever surfaces a generic rejection from authorize() returning null, so
 * this can't distinguish "expired" from "already used" from "invalid" the
 * way the old direct-consumption flow could — one honest message covers all
 * of them, with a way to just request a fresh link.
 */
export default function ConfirmMagicLoginResultPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Link ungültig oder abgelaufen
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Dieser Anmelde-Link wurde schon verwendet oder ist abgelaufen. Fordere
        einfach einen neuen an.
      </p>
      <Link href="/login" className="text-sm font-medium underline">
        Neuen Login-Link anfordern
      </Link>
    </div>
  );
}
