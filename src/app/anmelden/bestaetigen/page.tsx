import { AuthCard } from "@/components/ui";
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
    return <AuthCard center title="Ungültiger Link" lead="Dieser Anmelde-Link ist unvollständig." />;
  }

  return (
    <AuthCard
      center
      title="Anmelden"
      lead={
        <>
          Bestätige die Anmeldung für <strong className="break-all">{email}</strong>.
        </>
      }
    >
      <form action={confirmMagicLoginAction}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="btn btn-primary w-full">
          Jetzt anmelden
        </button>
      </form>
    </AuthCard>
  );
}
