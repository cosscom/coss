CREATE TYPE "public"."auth_email_kind" AS ENUM('verify_email', 'reset_password', 'invitation');--> statement-breakpoint
CREATE TYPE "public"."auth_email_status" AS ENUM('pending', 'sent', 'skipped', 'failed');--> statement-breakpoint
CREATE TABLE "auth_email" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "auth_email_kind" NOT NULL,
	"to" text NOT NULL,
	"user_id" text,
	"url" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "auth_email_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "discard_body" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "auth_email_next_attempt_idx" ON "auth_email" USING btree ("next_attempt_at") WHERE "auth_email"."next_attempt_at" IS NOT NULL;