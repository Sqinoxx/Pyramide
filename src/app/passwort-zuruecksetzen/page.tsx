import { AuthCard } from "@/components/ui";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <AuthCard center title="Ungültiger Link" lead="Dieser Link zum Zurücksetzen ist unvollständig." />
    );
  }

  return (
    <AuthCard title="Neues Passwort vergeben">
      <ResetPasswordForm email={email} token={token} />
    </AuthCard>
  );
}
