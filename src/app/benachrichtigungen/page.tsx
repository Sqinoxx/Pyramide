import { auth } from "@/auth";
import { getMemberByUserId } from "@/server/members";
import { listNotificationsForMember } from "@/server/notifications";
import { markAllReadAction, markReadAction } from "./actions";

type Payload = Record<string, unknown>;

function formatNotification(type: string, payload: Payload): { text: string; href: string } {
  switch (type) {
    case "challenge_received":
      return { text: `${payload.challengerName} fordert dich heraus.`, href: "/forderungen" };
    case "challenge_accepted":
      return { text: `${payload.defenderName} hat deine Forderung angenommen.`, href: "/forderungen" };
    case "challenge_declined":
      return {
        text: `${payload.defenderName} hat deine Forderung abgelehnt.${payload.reason ? ` Grund: ${payload.reason}` : ""}`,
        href: "/forderungen",
      };
    case "result_reported":
      return { text: `${payload.reporterName} hat ein Ergebnis gemeldet.`, href: "/forderungen" };
    case "result_confirmed":
      return {
        text: payload.auto
          ? "Dein Ergebnis wurde automatisch bestätigt."
          : "Dein Ergebnis wurde bestätigt.",
        href: "/forderungen",
      };
    case "deadline_reminder":
      return {
        text:
          payload.kind === "accept"
            ? `Erinnerung: Forderung von ${payload.opponentName} annehmen.`
            : `Erinnerung: Match gegen ${payload.opponentName} austragen.`,
        href: "/forderungen",
      };
    case "walkover":
      return {
        text: payload.won
          ? `Sieg gegen ${payload.opponentName} durch Nichtantreten.`
          : `Niederlage gegen ${payload.opponentName} durch Nichtantreten.`,
        href: "/forderungen",
      };
    case "position_change":
      return {
        text: `Position geändert: ${payload.direction === "up" ? "Aufstieg" : "Abstieg"} (${payload.reason}).`,
        href: "/",
      };
    case "inactivity_warning":
      return {
        text: `Du warst ${payload.weeksInactive} Wochen ohne Match.`,
        href: "/",
      };
    case "direct_message":
      return {
        text: `${payload.fromName}: ${payload.message}`,
        href: "/mitglieder",
      };
    default:
      return { text: type, href: "/" };
  }
}

export default async function NotificationsPage() {
  const session = await auth();
  const member = await getMemberByUserId(session!.user.id);
  if (!member) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center text-zinc-600 dark:text-zinc-400">
        Kein Mitgliedsprofil gefunden.
      </div>
    );
  }

  const items = await listNotificationsForMember(member.id);

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Benachrichtigungen
        </h1>
        {items.some((n) => !n.readAt) && (
          <form action={markAllReadAction}>
            <button type="submit" className="text-sm underline text-zinc-600 dark:text-zinc-400">
              Alle als gelesen markieren
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Keine Benachrichtigungen.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const { text, href } = formatNotification(n.type, n.payload as Payload);
            return (
              <li
                key={n.id}
                className={
                  "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm " +
                  (n.readAt
                    ? "border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
                    : "border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-900 dark:text-zinc-50")
                }
              >
                <a href={href} className="flex-1 hover:underline">
                  {text}
                  <span className="ml-2 text-xs text-zinc-400">
                    {new Date(n.createdAt).toLocaleString("de-AT")}
                  </span>
                </a>
                {!n.readAt && (
                  <form action={markReadAction}>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <button type="submit" className="text-xs underline">
                      gelesen
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
