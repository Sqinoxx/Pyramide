import Link from "next/link";
import { AuthCard } from "@/components/ui";

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
    <AuthCard
      center
      title="Link ungültig oder abgelaufen"
      lead="Dieser Anmelde-Link wurde schon verwendet oder ist abgelaufen. Fordere einfach einen neuen an."
    >
      <Link href="/login" className="btn btn-primary w-full">
        Neuen Login-Link anfordern
      </Link>
    </AuthCard>
  );
}
