import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
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
          Dieser Link zum Zurücksetzen ist unvollständig.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Neues Passwort vergeben
      </h1>
      <ResetPasswordForm email={email} token={token} />
    </div>
  );
}
