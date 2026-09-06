-- Hand-written (see drizzle/0001_partial_indexes.sql for why): drizzle-kit's
-- interactive rename-vs-drop prompt for `verification_tokens.token` needs a
-- TTY, which isn't available in this environment, so this migration is
-- authored directly instead of via `drizzle-kit generate`.
--
-- Drops the unused `sessions` table (auth uses next-auth's JWT strategy, see
-- src/auth.ts — nothing ever gets persisted there) and switches
-- verification_tokens to store a token *hash* instead of the raw token, plus
-- a `consumed_at` marker so a token can't be replayed after use.
DROP TABLE "sessions";--> statement-breakpoint

ALTER TABLE "verification_tokens" DROP CONSTRAINT "verification_tokens_identifier_token_pk";--> statement-breakpoint
ALTER TABLE "verification_tokens" RENAME COLUMN "token" TO "token_hash";--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD COLUMN "consumed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_identifier_token_hash_pk" PRIMARY KEY ("identifier", "token_hash");
