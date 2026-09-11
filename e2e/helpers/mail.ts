import { E2E_MAILDEV_API } from "../env";

type MaildevMessage = {
  id: string;
  to: Array<{ address: string }>;
  subject: string;
  text: string;
  html: string;
  time: string;
};

/**
 * Polls Maildev's REST API for the newest message to `to` whose subject
 * contains `subjectContains`, then pulls the first http(s) link out of its
 * plain-text body. Mirrors how a real user would find the link in their
 * inbox — no shortcut through the database, since the raw magic-link token
 * is deliberately never persisted (src/server/tokens.ts only stores a hash).
 */
export async function waitForMagicLink(
  to: string,
  subjectContains: string,
  timeoutMs = 10_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastCount = 0;

  while (Date.now() < deadline) {
    const res = await fetch(`${E2E_MAILDEV_API}/email`);
    const messages = (await res.json()) as MaildevMessage[];
    lastCount = messages.length;

    const match = messages
      .filter((m) => m.to.some((t) => t.address === to) && m.subject.includes(subjectContains))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];

    if (match) {
      const linkMatch = match.text.match(/https?:\/\/\S+/);
      if (!linkMatch) throw new Error(`Mail to ${to} had no link in its body`);
      return linkMatch[0];
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error(
    `No mail to ${to} with subject containing "${subjectContains}" after ${timeoutMs}ms (${lastCount} messages in inbox)`,
  );
}

