import Link from "next/link";

const MESSAGES: Record<string, { title: string; text: string }> = {
  ok: {
    title: "E-Mail bestätigt",
    text: "Deine E-Mail-Adresse wurde bestätigt. Ein Admin schaltet dein Konto als Nächstes frei.",
  },
  already_used: {
    title: "Bereits bestätigt",
    text: "Dieser Link wurde schon verwendet. Falls du dich noch nicht anmelden kannst, wende dich an einen Admin.",
  },
  expired: {
    title: "Link abgelaufen",
    text: "Dieser Bestätigungslink ist abgelaufen. Bitte registriere dich erneut oder wende dich an einen Admin.",
  },
  invalid: {
    title: "Ungültiger Link",
    text: "Dieser Bestätigungslink ist ungültig.",
  },
};

export default async function VerifyResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const message = MESSAGES[status ?? ""] ?? MESSAGES.invalid;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {message.title}
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">{message.text}</p>
      <Link href="/login" className="text-sm font-medium underline">
        Zur Anmeldung
      </Link>
    </div>
  );
}
