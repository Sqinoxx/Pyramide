import "server-only";
import crypto from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { verificationTokens } from "@/db/schema";

export type TokenPurpose = "verify-email" | "reset-password";

const TOKEN_BYTES = 32;
const EXPIRY_MS: Record<TokenPurpose, number> = {
  "verify-email": 3 * 24 * 60 * 60 * 1000, // 3 days
  "reset-password": 60 * 60 * 1000, // 1 hour
};

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Creates a new token and returns the *raw* value to embed in an email link.
 * Only the SHA-256 hash is persisted (see schema.ts comment on
 * verification_tokens) — a database leak alone can't be used to complete a
 * verification or reset flow.
 */
export async function createVerificationToken(
  identifier: string,
  purpose: TokenPurpose,
): Promise<string> {
  const raw = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  await db.insert(verificationTokens).values({
    identifier,
    tokenHash: hashToken(raw),
    purpose,
    expiresAt: new Date(Date.now() + EXPIRY_MS[purpose]),
  });
  return raw;
}

export type ConsumeResult =
  | { ok: true; identifier: string }
  | { ok: false; reason: "invalid" | "expired" | "already_used" };

/**
 * Validates and immediately marks a token as consumed (single use). Callers
 * should treat "invalid" and "expired" identically in user-facing messaging
 * to avoid leaking which is the case.
 */
export async function consumeVerificationToken(
  rawToken: string,
  identifier: string,
  purpose: TokenPurpose,
): Promise<ConsumeResult> {
  const tokenHash = hashToken(rawToken);

  const row = await db.query.verificationTokens.findFirst({
    where: and(
      eq(verificationTokens.identifier, identifier),
      eq(verificationTokens.tokenHash, tokenHash),
      eq(verificationTokens.purpose, purpose),
    ),
  });

  if (!row) return { ok: false, reason: "invalid" };
  if (row.consumedAt) return { ok: false, reason: "already_used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.tokenHash, tokenHash),
        isNull(verificationTokens.consumedAt),
      ),
    );

  return { ok: true, identifier };
}
