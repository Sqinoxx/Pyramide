import { auth } from "@/auth";
import { getMemberByUserId } from "@/server/members";
import { listNotificationsForMember } from "@/server/notifications";
import { markAllReadAction, markReadAction } from "./actions";
import { EmptyState, Notice, PageHeader } from "@/components/ui";

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
    return <Notice>Kein Mitgliedsprofil gefunden.</Notice>;
  }

  const items = await listNotificationsForMember(member.id);

  return (
    <div className="page max-w-2xl">
      <PageHeader
        title="Benachrichtigungen"
        actions={
          items.some((n) => !n.readAt) && (
            <form action={markAllReadAction}>
              <button type="submit" className="btn btn-secondary btn-sm">
                Alle als gelesen markieren
              </button>
            </form>
          )
        }
      />

      {items.length === 0 ? (
        <EmptyState>Keine Benachrichtigungen.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((n) => {
            const { text, href } = formatNotification(n.type, n.payload as Payload);
            const unread = !n.readAt;
            return (
              <li
                key={n.id}
                className={
                  "flex items-start gap-3 px-4 py-3 text-sm " +
                  (unread ? "bg-brand-50/60 dark:bg-brand-950/40" : "")
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full " + (unread ? "bg-brand-500" : "bg-line")
                  }
                />
                <a href={href} className="min-w-0 flex-1">
                  <span
                    className={
                      "block break-words " +
                      (unread
                        ? "font-medium text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-600 dark:text-zinc-400")
                    }
                  >
                    {text}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-400 dark:text-zinc-500">
                    {new Date(n.createdAt).toLocaleString("de-AT")}
                  </span>
                </a>
                {unread && (
                  <form action={markReadAction} className="shrink-0">
                    <input type="hidden" name="notificationId" value={n.id} />
                    <button type="submit" className="btn btn-ghost btn-sm -my-1">
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
