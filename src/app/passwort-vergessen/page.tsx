import { AuthCard } from "@/components/ui";
import { RequestResetForm } from "./RequestResetForm";

export default function RequestPasswordResetPage() {
  return (
    <AuthCard
      title="Passwort vergessen"
      lead="Gib deine E-Mail-Adresse ein, wir schicken dir einen Link zum Zurücksetzen."
    >
      <RequestResetForm />
    </AuthCard>
  );
}
