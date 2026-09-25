import Link from "next/link";
import { AuthCard } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <AuthCard
      title="Anmelden"
      lead="Kein Passwort nötig — wir schicken dir einen Login-Link per E-Mail."
      footer={
        <>
          Noch nicht angemeldet?{" "}
          <Link href="/beitreten" className="link">
            Zur Pyramide anmelden
          </Link>
        </>
      }
    >
      <LoginForm callbackUrl={callbackUrl ?? "/profil"} />
    </AuthCard>
  );
}
