import "server-only";
import nodemailer from "nodemailer";
import { escapeHtml as esc } from "@/lib/html-escape";

/**
 * Single shared SMTP transport + tiny plain-text/HTML templates for the
 * transactional mails from PLAN.md (verification, password reset; challenge
 * notifications are added in a later phase). Kept deliberately template-free
 * (no React Email) for Phase 1 — revisit if the mail surface grows.
 */

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  if (transport) return transport;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!host) throw new Error("SMTP_HOST is not set");
  transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return transport;
}

async function send(to: string, subject: string, text: string, html: string) {
  const from = process.env.SMTP_FROM ?? "no-reply@example.com";
  await getTransport().sendMail({ from, to, subject, text, html });
}

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="de"><body style="font-family:sans-serif;line-height:1.5;color:#18181b">
    <h2 style="margin:0 0 16px">${title}</h2>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#71717a">Tennis-Forderungspyramide</p>
  </body></html>`;
}

/**
 * Passwordless login link (src/auth.ts's "magic-link" provider) — used both
 * for a brand-new join (isNewJoin: true, PLAN.md follow-up: no separate
 * password/verification step, clicking this link *is* the verification)
 * and for a returning member's regular login.
 */
export async function sendMagicLoginEmail(
  to: string,
  firstName: string,
  rawToken: string,
  isNewJoin: boolean,
) {
  const link = appUrl(`/anmelden/bestaetigen?email=${encodeURIComponent(to)}&token=${rawToken}`);
  const subject = isNewJoin ? "Anmeldung zur Pyramide bestätigen" : "Dein Login-Link";
  const intro = isNewJoin
    ? "bitte bestätige deine Anmeldung zur Tennis-Pyramide:"
    : "hier ist dein Login-Link:";
  await send(
    to,
    subject,
    `Hallo ${firstName},\n\n${intro} ${link}\n\nDer Link ist 15 Minuten gültig.`,
    layout(
      subject,
      `<p>Hallo ${esc(firstName)},</p>
       <p>${intro}</p>
       <p><a href="${link}" style="display:inline-block;background:#18181b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">${isNewJoin ? "Anmeldung bestätigen" : "Anmelden"}</a></p>
       <p>Der Link ist 15 Minuten gültig. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>`,
    ),
  );
}

/** Same idea as sendMagicLoginEmail, but a specific label since this one comes from the pyramid join flow. */
export async function sendJoinConfirmationEmail(to: string, firstName: string, rawToken: string) {
  await sendMagicLoginEmail(to, firstName, rawToken, true);
}

export async function sendPasswordResetEmail(to: string, firstName: string, rawToken: string) {
  const link = appUrl(`/passwort-zuruecksetzen?email=${encodeURIComponent(to)}&token=${rawToken}`);
  await send(
    to,
    "Passwort zurücksetzen",
    `Hallo ${firstName},\n\nsetze dein Passwort hier zurück: ${link}\n\nDer Link ist 1 Stunde gültig. Falls du das nicht angefordert hast, ignoriere diese E-Mail.`,
    layout(
      "Passwort zurücksetzen",
      `<p>Hallo ${esc(firstName)},</p>
       <p>klicke auf den folgenden Link, um ein neues Passwort zu vergeben:</p>
       <p><a href="${link}" style="display:inline-block;background:#18181b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Passwort zurücksetzen</a></p>
       <p>Der Link ist 1 Stunde gültig. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>`,
    ),
  );
}

export async function sendAdminApprovalNeededEmail(to: string, memberName: string) {
  const link = appUrl("/admin/mitglieder");
  await send(
    to,
    "Neue Anmeldung wartet auf Freigabe",
    `${memberName} möchte der Pyramide beitreten und wartet auf Freigabe: ${link}`,
    layout(
      "Neue Anmeldung wartet auf Freigabe",
      `<p><strong>${esc(memberName)}</strong> möchte der Pyramide beitreten und wartet auf Freigabe.</p>
       <p><a href="${link}">Zur Mitgliederverwaltung</a></p>`,
    ),
  );
}

/**
 * Generic wrapper used by src/server/notifications.ts for the challenge/
 * match/deadline notifications from PLAN.md §8 — those have too many
 * variants to warrant a dedicated template function each like the auth
 * mails above.
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  bodyText: string,
  bodyHtml: string,
  linkPath?: string,
) {
  const link = linkPath ? appUrl(linkPath) : null;
  await send(
    to,
    subject,
    bodyText + (link ? `\n\n${link}` : ""),
    layout(subject, bodyHtml + (link ? `<p><a href="${link}">Ansehen</a></p>` : "")),
  );
}

export async function sendMemberApprovedEmail(to: string, firstName: string, divisionName: string) {
  const link = appUrl("/profil");
  await send(
    to,
    "Du wurdest freigeschaltet",
    `Hallo ${firstName},\n\ndu bist jetzt Teil der ${divisionName}-Pyramide: ${link}`,
    layout(
      "Willkommen in der Pyramide",
      `<p>Hallo ${esc(firstName)},</p>
       <p>dein Konto wurde freigeschaltet und du bist ab sofort Teil der <strong>${esc(divisionName)}</strong>-Pyramide.</p>
       <p><a href="${link}">Zu deinem Profil</a></p>`,
    ),
  );
}
