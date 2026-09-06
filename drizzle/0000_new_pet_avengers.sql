CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."challenge_state" AS ENUM('proposed', 'accepted', 'declined', 'reported', 'disputed', 'expired_accept', 'expired_play', 'cancelled', 'settled');--> statement-breakpoint
CREATE TYPE "public"."division_key" AS ENUM('herren', 'damen');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('m', 'w', 'd');--> statement-breakpoint
CREATE TYPE "public"."itn_source" AS ENUM('import', 'admin', 'self');--> statement-breakpoint
CREATE TYPE "public"."match_resolution" AS ENUM('played', 'walkover_challenger', 'walkover_defender', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('pending', 'active', 'paused', 'left');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('challenge_received', 'challenge_accepted', 'challenge_declined', 'result_reported', 'result_confirmed', 'deadline_reminder', 'walkover', 'inactivity_warning', 'position_change', 'announcement', 'itn_mismatch');--> statement-breakpoint
CREATE TYPE "public"."position_reason" AS ENUM('seed', 'challenge_win', 'swap_loss', 'inactivity', 'admin', 'insert');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."season_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" text,
	"title" varchar(200) NOT NULL,
	"body_md" text NOT NULL,
	"published_at" timestamp with time zone,
	"author_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" varchar(100) NOT NULL,
	"entity" varchar(100) NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"member_id" text NOT NULL,
	"weekday" smallint NOT NULL,
	"from_time" varchar(5) NOT NULL,
	"to_time" varchar(5) NOT NULL,
	CONSTRAINT "availability_member_id_weekday_from_time_pk" PRIMARY KEY("member_id","weekday","from_time")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" text NOT NULL,
	"challenger_id" text NOT NULL,
	"defender_id" text NOT NULL,
	"state" "challenge_state" DEFAULT 'proposed' NOT NULL,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accept_deadline" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"play_deadline" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"court" varchar(100),
	"resolved_at" timestamp with time zone,
	"resolution" "match_resolution",
	"decline_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "division_key" NOT NULL,
	"name" varchar(64) NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "divisions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "itn_imports" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(32) NOT NULL,
	"file_name" text,
	"imported_by" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itn_links" (
	"member_id" text NOT NULL,
	"itn_record_id" text NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "itn_links_member_id_itn_record_id_pk" PRIMARY KEY("member_id","itn_record_id")
);
--> statement-breakpoint
CREATE TABLE "itn_records" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" text NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"birth_year" smallint,
	"gender" "gender",
	"club" varchar(150),
	"region" varchar(64),
	"licence_no" varchar(32),
	"itn" numeric(3, 1) NOT NULL,
	"points" integer,
	"normalized_name" text NOT NULL,
	"valid_from" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_sets" (
	"match_id" text NOT NULL,
	"set_no" smallint NOT NULL,
	"games_a" smallint NOT NULL,
	"games_b" smallint NOT NULL,
	"tiebreak_a" smallint,
	"tiebreak_b" smallint,
	CONSTRAINT "match_sets_match_id_set_no_pk" PRIMARY KEY("match_id","set_no")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" text NOT NULL,
	"played_at" timestamp with time zone,
	"winner_id" text,
	"retired" boolean DEFAULT false NOT NULL,
	"walkover" boolean DEFAULT false NOT NULL,
	"reported_by" text,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_challenge_id_unique" UNIQUE("challenge_id")
);
--> statement-breakpoint
CREATE TABLE "member_itn" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" text NOT NULL,
	"source" "itn_source" NOT NULL,
	"value" numeric(3, 1) NOT NULL,
	"licence_no" varchar(32),
	"as_of" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"birth_year" smallint,
	"gender" "gender" NOT NULL,
	"club" varchar(150),
	"division_id" text,
	"phone" varchar(40),
	"avatar_url" text,
	"status" "member_status" DEFAULT 'pending' NOT NULL,
	"on_leave_until" timestamp with time zone,
	"joined_at" timestamp with time zone,
	"preferred_times" text,
	"notes" text,
	"show_itn_publicly" boolean DEFAULT true NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position_history" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" text NOT NULL,
	"member_id" text NOT NULL,
	"from_row" integer,
	"from_slot" integer,
	"to_row" integer NOT NULL,
	"to_slot" integer NOT NULL,
	"reason" "position_reason" NOT NULL,
	"challenge_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" text NOT NULL,
	"member_id" text NOT NULL,
	"row" integer NOT NULL,
	"slot" integer NOT NULL,
	"since" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"status" "season_status" DEFAULT 'draft' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"role" "role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(320) NOT NULL,
	"token" text NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_challenger_id_members_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_defender_id_members_id_fk" FOREIGN KEY ("defender_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itn_imports" ADD CONSTRAINT "itn_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itn_links" ADD CONSTRAINT "itn_links_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itn_links" ADD CONSTRAINT "itn_links_itn_record_id_itn_records_id_fk" FOREIGN KEY ("itn_record_id") REFERENCES "public"."itn_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itn_links" ADD CONSTRAINT "itn_links_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itn_records" ADD CONSTRAINT "itn_records_import_id_itn_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."itn_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_sets" ADD CONSTRAINT "match_sets_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_members_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_reported_by_members_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_confirmed_by_members_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_itn" ADD CONSTRAINT "member_itn_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_itn" ADD CONSTRAINT "member_itn_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_history" ADD CONSTRAINT "position_history_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_history" ADD CONSTRAINT "position_history_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "challenges_challenger_idx" ON "challenges" USING btree ("challenger_id");--> statement-breakpoint
CREATE INDEX "challenges_defender_idx" ON "challenges" USING btree ("defender_id");--> statement-breakpoint
CREATE INDEX "itn_records_normalized_name_trgm_idx" ON "itn_records" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "member_itn_active_per_source_idx" ON "member_itn" USING btree ("member_id","source") WHERE "member_itn"."superseded_at" is null;--> statement-breakpoint
CREATE INDEX "member_itn_member_idx" ON "member_itn" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "members_normalized_name_trgm_idx" ON "members" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "members_division_idx" ON "members" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "notifications_member_unread_idx" ON "notifications" USING btree ("member_id","read_at");--> statement-breakpoint
CREATE INDEX "position_history_season_member_idx" ON "position_history" USING btree ("season_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "positions_season_row_slot_idx" ON "positions" USING btree ("season_id","row","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "positions_season_member_idx" ON "positions" USING btree ("season_id","member_id");