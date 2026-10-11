CREATE TYPE "public"."organization_deletion_status" AS ENUM('pending', 'completed');--> statement-breakpoint
CREATE TABLE "organization_deletion" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"organization_name" text NOT NULL,
	"organization_slug" text NOT NULL,
	"requested_by_user_id" text,
	"requested_by_email" text NOT NULL,
	"by_platform_admin" boolean DEFAULT false NOT NULL,
	"status" "organization_deletion_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now(),
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_deletion_org_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE INDEX "organization_deletion_next_attempt_idx" ON "organization_deletion" USING btree ("next_attempt_at") WHERE "organization_deletion"."next_attempt_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "webhook_message_environment_idx" ON "webhook_message" USING btree ("environment_id");