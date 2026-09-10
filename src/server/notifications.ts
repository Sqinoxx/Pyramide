import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { members, notifications, type notificationTypeEnum } from "@/db/schema";
import { sendNotificationEmail } from "./mailer";
import { escapeHtml as esc } from "@/lib/html-escape";

type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

/**
 * Writes the in-app notification row and best-effort sends the matching
 * email — a failed email never blocks or rolls back the action that
 * triggered it (matches the pattern already used for the auth mails in
 * src/server/members.ts).
 */
async function notify(
  memberId: string,
  type: NotificationType,
  payload: Record<string, unknown>,
  email: { subject: string; text: string; html: string; linkPath?: string },
) {
  await db.insert(notifications).values({ memberId, type, payload });

  const member = await db.query.members.findFirst({
    where: eq(members.id, memberId),
    with: { user: true },
  });
  if (member?.user.email) {
    await sendNotificationEmail(
      member.user.email,
      email.subject,
      email.text,
      email.html,
      email.linkPath,
    ).catch((err) => console.error("[notify] email send failed", err));
  }
}

const FORDERUNGEN_PATH = "/forderungen";

export async function notifyChallengeReceived(
  defenderMemberId: string,
  challengerName: string,
) {
  await notify(
    defenderMemberId,
    "challenge_received",
    { challengerName },
    {
      subject: "Du wurdest gefordert",
      text: `${challengerName} fordert dich heraus.`,
      html: `<p><strong>${esc(challengerName)}</strong> fordert dich heraus. Bitte innerhalb der Frist annehmen oder ablehnen.</p>`,
      linkPath: FORDERUNGEN_PATH,
    },
  );
}

export async function notifyChallengeAccepted(challengerMemberId: string, defenderName: string) {
  await notify(
    challengerMemberId,
    "challenge_accepted",
    { defenderName },
    {
      subject: "Deine Forderung wurde angenommen",
      text: `${defenderName} hat deine Forderung angenommen. Bitte einen Termin ausmachen.`,
      html: `<p><strong>${esc(defenderName)}</strong> hat deine Forderung angenommen. Macht einen Termin aus.</p>`,
      linkPath: FORDERUNGEN_PATH,
    },
  );
}

export async function notifyChallengeDeclined(
  challengerMemberId: string,
  defenderName: string,
  reason: string | null,
) {
  await notify(
    challengerMemberId,
    "challenge_declined",
    { defenderName, reason },
    {
      subject: "Deine Forderung wurde abgelehnt",
      text: `${defenderName} hat deine Forderung abgelehnt.${reason ? ` Grund: ${reason}` : ""}`,
      html: `<p><strong>${esc(defenderName)}</strong> hat deine Forderung abgelehnt.${reason ? ` Grund: ${esc(reason)}` : ""}</p>`,
      linkPath: FORDERUNGEN_PATH,
    },
  );
}

export async function notifyResultReported(recipientMemberId: string, reporterName: string) {
  await notify(
    recipientMemberId,
    "result_reported",
    { reporterName },
    {
      subject: "Ergebnis gemeldet — bitte bestätigen",
      text: `${reporterName} hat ein Ergebnis gemeldet. Bitte bestätigen oder bestreiten.`,
      html: `<p><strong>${esc(reporterName)}</strong> hat ein Ergebnis gemeldet. Bitte bestätige es oder bestreite es.</p>`,
      linkPath: FORDERUNGEN_PATH,
    },
  );
}

export async function notifyResultConfirmed(reporterMemberId: string, auto: boolean) {
  await notify(
    reporterMemberId,
    "result_confirmed",
    { auto },
    {
      subject: "Ergebnis bestätigt",
      text: auto
        ? "Dein gemeldetes Ergebnis wurde automatisch bestätigt (Frist abgelaufen)."
        : "Dein gemeldetes Ergebnis wurde bestätigt.",
      html: `<p>Dein gemeldetes Ergebnis wurde ${auto ? "automatisch (Frist abgelaufen)" : ""} bestätigt.</p>`,
      linkPath: FORDERUNGEN_PATH,
    },
  );
}

export async function notifyWalkover(memberId: string, won: boolean, opponentName: string) {
  await notify(
    memberId,
    "walkover",
    { won, opponentName },
    {
      subject: won ? "Sieg durch Nichtantreten" : "Niederlage durch Nichtantreten",
      text: won
        ? `Du hast gegen ${opponentName} durch Nichtantreten gewonnen.`
        : `Du hast gegen ${opponentName} durch Nichtantreten verloren.`,
      html: `<p>${won ? `Sieg gegen ${esc(opponentName)} durch Nichtantreten.` : `Niederlage gegen ${esc(opponentName)} durch Nichtantreten.`}</p>`,
      linkPath: FORDERUNGEN_PATH,
    },
  );
}

export async function notifyDeadlineReminder(
  memberId: string,
  challengeId: string,
  kind: "accept" | "play",
  opponentName: string,
  deadline: Date,
) {
  const deadlineStr = deadline.toLocaleDateString("de-AT");
  await notify(
    memberId,
    "deadline_reminder",
    { challengeId, kind, opponentName, deadline: deadline.toISOString() },
    {
      subject:
        kind === "accept" ? "Erinnerung: Forderung annehmen" : "Erinnerung: Match austragen",
      text:
        kind === "accept"
          ? `Erinnerung: Nimm die Forderung von ${opponentName} bis ${deadlineStr} an.`
          : `Erinnerung: Trage dein Match gegen ${opponentName} bis ${deadlineStr} aus.`,
      html: `<p>Erinnerung: ${kind === "accept" ? `Nimm die Forderung von ${esc(opponentName)}` : `Trage dein Match gegen ${esc(opponentName)} aus`} — Frist: ${deadlineStr}.</p>`,
      linkPath: FORDERUNGEN_PATH,
    },
  );
}

export async function notifyPositionChange(
  memberId: string,
  direction: "up" | "down",
  reason: string,
) {
  await notify(
    memberId,
    "position_change",
    { direction, reason },
    {
      subject: direction === "up" ? "Du bist aufgestiegen" : "Du bist abgestiegen",
      text: `Deine Position in der Pyramide hat sich geändert (${reason}).`,
      html: `<p>Deine Position in der Pyramide hat sich geändert: ${direction === "up" ? "Aufstieg" : "Abstieg"} (${reason}).</p>`,
      linkPath: "/",
    },
  );
}

export async function notifyInactivityWarning(memberId: string, weeksInactive: number) {
  await notify(
    memberId,
    "inactivity_warning",
    { weeksInactive },
    {
      subject: "Hinweis: Inaktivität",
      text: `Du warst ${weeksInactive} Wochen ohne Match. Bei anhaltender Inaktivität rückst du eine Position nach unten.`,
      html: `<p>Du warst ${weeksInactive} Wochen ohne Match. Bei anhaltender Inaktivität rückst du eine Position in der Pyramide nach unten. Fordere jemanden, um aktiv zu bleiben!</p>`,
      linkPath: "/",
    },
  );
}

/**
 * Dedup guard for the reminder job (src/server/jobs/reminders.ts), which
 * runs frequently and must not re-notify on every tick. Matches on the
 * challengeId embedded in the notification payload.
 */
export async function hasDeadlineReminderBeenSent(
  memberId: string,
  challengeId: string,
  kind: "accept" | "play",
): Promise<boolean> {
  const existing = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.memberId, memberId),
      eq(notifications.type, "deadline_reminder"),
      sql`${notifications.payload}->>'challengeId' = ${challengeId}`,
      sql`${notifications.payload}->>'kind' = ${kind}`,
    ),
  });
  return !!existing;
}

export async function listNotificationsForMember(memberId: string) {
  return db.query.notifications.findMany({
    where: eq(notifications.memberId, memberId),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit: 50,
  });
}

export async function markNotificationRead(notificationId: string, memberId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.memberId, memberId)));
}

export async function markAllNotificationsRead(memberId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.memberId, memberId), sql`${notifications.readAt} is null`));
}

export async function countUnreadNotifications(memberId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.memberId, memberId), sql`${notifications.readAt} is null`));
  return row?.count ?? 0;
}

/**
 * The "Kontaktmöglichkeit ohne Preisgabe von Telefonnummern" from PLAN.md
 * v1: routes a short message through the existing notification/email
 * pipeline instead of exposing either side's phone number or email address
 * to the other.
 */
export async function sendContactMessage(
  fromMemberId: string,
  toMemberId: string,
  fromName: string,
  message: string,
) {
  await notify(
    toMemberId,
    "direct_message",
    { fromMemberId, fromName, message },
    {
      subject: `Nachricht von ${fromName}`,
      text: message,
      html: `<p><strong>${esc(fromName)}</strong> schreibt:</p><p>${esc(message).replace(/\n/g, "<br>")}</p>`,
      linkPath: "/benachrichtigungen",
    },
  );
}
