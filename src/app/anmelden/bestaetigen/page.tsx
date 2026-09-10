import { confirmMagicLoginAction } from "./actions";

/**
 * Deliberately click-through rather than auto-consuming on GET: some mail
 * clients / security scanners prefetch links in emails, which would burn a
 * single-use login token before the actual recipient clicks it.
 */
export default async function ConfirmMagicLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Ungültiger Link
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Dieser Anmelde-Link ist unvollständig.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Anmelden</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Bestätige die Anmeldung für <strong>{email}</strong>.
      </p>
      <form action={confirmMagicLoginAction}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Jetzt anmelden
        </button>
      </form>
    </div>
  );
}
