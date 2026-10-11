CREATE TYPE "public"."reputation_notification_status" AS ENUM('pending', 'sent', 'skipped', 'failed');--> statement-breakpoint
CREATE TABLE "reputation_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"reputation_event_id" text NOT NULL,
	"type" "reputation_event_type" NOT NULL,
	"status" "reputation_notification_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"recipients" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reputation_notification" ADD CONSTRAINT "reputation_notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_notification" ADD CONSTRAINT "reputation_notification_event_fk" FOREIGN KEY ("reputation_event_id","organization_id") REFERENCES "public"."reputation_event"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reputation_notification_event_idx" ON "reputation_notification" USING btree ("reputation_event_id");--> statement-breakpoint
CREATE INDEX "reputation_notification_next_attempt_idx" ON "reputation_notification" USING btree ("next_attempt_at") WHERE "reputation_notification"."next_attempt_at" IS NOT NULL;