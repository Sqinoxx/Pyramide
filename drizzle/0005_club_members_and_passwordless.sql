CREATE TABLE "club_member_imports" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(32) NOT NULL,
	"file_name" text,
	"imported_by" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_members" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" text NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"birth_year" smallint,
	"email" varchar(320),
	"normalized_name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "club_member_imports" ADD CONSTRAINT "club_member_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_import_id_club_member_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."club_member_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_members_normalized_name_trgm_idx" ON "club_members" USING gin ("normalized_name" gin_trgm_ops);