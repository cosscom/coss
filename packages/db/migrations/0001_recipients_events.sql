ALTER TABLE "email" ADD CONSTRAINT "email_id_organization_unique" UNIQUE("id","organization_id");--> statement-breakpoint
CREATE TYPE "public"."email_event_type" AS ENUM('email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced', 'email.complained', 'email.failed');--> statement-breakpoint
CREATE TYPE "public"."email_recipient_kind" AS ENUM('to', 'cc', 'bcc');--> statement-breakpoint
CREATE TYPE "public"."email_recipient_status" AS ENUM('queued', 'sent', 'delivery_delayed', 'delivered', 'bounced', 'suppressed', 'complained', 'failed');--> statement-breakpoint
CREATE TABLE "email_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"email_id" text NOT NULL,
	"type" "email_event_type" NOT NULL,
	"provider" text NOT NULL,
	"provider_event_type" text NOT NULL,
	"recipient" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"dedupe_key" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_event_email_dedupe_unique" UNIQUE("email_id","dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "email_recipient" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email_id" text NOT NULL,
	"address" text NOT NULL,
	"kind" "email_recipient_kind" NOT NULL,
	"position" integer NOT NULL,
	"status" "email_recipient_status" DEFAULT 'queued' NOT NULL,
	"last_event_at" timestamp with time zone,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_recipient_email_address_unique" UNIQUE("email_id","address")
);
--> statement-breakpoint
ALTER TABLE "email_event" ADD CONSTRAINT "email_event_email_fk" FOREIGN KEY ("email_id","organization_id") REFERENCES "public"."email"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_recipient" ADD CONSTRAINT "email_recipient_email_fk" FOREIGN KEY ("email_id","organization_id") REFERENCES "public"."email"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_event_email_occurred_at_idx" ON "email_event" USING btree ("email_id","occurred_at");