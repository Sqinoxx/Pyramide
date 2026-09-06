CREATE TABLE "itn_match_dismissals" (
	"member_id" text NOT NULL,
	"itn_record_id" text NOT NULL,
	"dismissed_by" text NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itn_match_dismissals_member_id_itn_record_id_pk" PRIMARY KEY("member_id","itn_record_id")
);
--> statement-breakpoint
ALTER TABLE "itn_match_dismissals" ADD CONSTRAINT "itn_match_dismissals_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itn_match_dismissals" ADD CONSTRAINT "itn_match_dismissals_itn_record_id_itn_records_id_fk" FOREIGN KEY ("itn_record_id") REFERENCES "public"."itn_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itn_match_dismissals" ADD CONSTRAINT "itn_match_dismissals_dismissed_by_users_id_fk" FOREIGN KEY ("dismissed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;