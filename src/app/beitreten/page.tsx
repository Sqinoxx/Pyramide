import Link from "next/link";
import { AuthCard } from "@/components/ui";
import { JoinForm } from "./JoinForm";

export default function JoinPage() {
  return (
    <AuthCard
      wide
      title="Zur Pyramide anmelden"
      lead="Für Mitglieder von UTC Neukirchen. Kein Passwort nötig — nach dem Bestätigen deiner E-Mail-Adresse prüft ein Admin deine Anmeldung, bevor du in die Pyramide aufgenommen wirst."
      footer={
        <>
          Schon angemeldet?{" "}
          <Link href="/login" className="link">
            Login-Link anfordern
          </Link>
        </>
      }
    >
      <JoinForm />
    </AuthCard>
  );
}
