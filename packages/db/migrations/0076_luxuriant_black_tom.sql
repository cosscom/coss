CREATE TYPE "public"."broadcast_screening_status" AS ENUM('pending', 'passed', 'held', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."broadcast_status" AS ENUM('draft', 'scheduled', 'sending', 'paused', 'sent', 'canceled', 'failed');--> statement-breakpoint
CREATE TABLE "broadcast" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"name" text NOT NULL,
	"status" "broadcast_status" DEFAULT 'draft' NOT NULL,
	"audience_id" text,
	"segment_id" text,
	"topic" text,
	"from" text NOT NULL,
	"reply_to" text[] DEFAULT '{}'::text[] NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text,
	"html" text,
	"text" text,
	"track_opens" boolean DEFAULT false NOT NULL,
	"track_clicks" boolean DEFAULT false NOT NULL,
	"rate_per_second" integer,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"contact_upper_bound" text,
	"cursor" text,
	"recipients_estimated" integer,
	"materialized" integer DEFAULT 0 NOT NULL,
	"screening_status" "broadcast_screening_status" DEFAULT 'pending' NOT NULL,
	"lease_until" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"pause_reason" text,
	"error_code" text,
	"error_message" text,
	"idempotency_key" text,
	"request_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "broadcast_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "broadcast_environment_idempotency_key_unique" UNIQUE("environment_id","idempotency_key"),
	CONSTRAINT "broadcast_target_check" CHECK (("broadcast"."audience_id" is null) <> ("broadcast"."segment_id" is null))
);
--> statement-breakpoint
CREATE TABLE "broadcast_stat" (
	"broadcast_id" text NOT NULL,
	"shard" integer NOT NULL,
	"organization_id" text NOT NULL,
	"recipients" integer DEFAULT 0 NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"bounced" integer DEFAULT 0 NOT NULL,
	"complained" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"opened" integer DEFAULT 0 NOT NULL,
	"clicked" integer DEFAULT 0 NOT NULL,
	"unsubscribed" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "broadcast_stat_broadcast_id_shard_pk" PRIMARY KEY("broadcast_id","shard")
);
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "broadcast_id" text;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "contact_id" text;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "variables" jsonb;--> statement-breakpoint
ALTER TABLE "broadcast" ADD CONSTRAINT "broadcast_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_stat" ADD CONSTRAINT "broadcast_stat_broadcast_fk" FOREIGN KEY ("broadcast_id","organization_id") REFERENCES "public"."broadcast"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "broadcast_environment_created_at_idx" ON "broadcast" USING btree ("environment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "broadcast_due_idx" ON "broadcast" USING btree ("next_run_at") WHERE "broadcast"."status" in ('scheduled', 'sending');--> statement-breakpoint
CREATE UNIQUE INDEX "email_broadcast_contact_unique" ON "email" USING btree ("broadcast_id","contact_id") WHERE "email"."broadcast_id" is not null;--> statement-breakpoint
CREATE INDEX "email_broadcast_status_idx" ON "email" USING btree ("broadcast_id","status") WHERE "email"."broadcast_id" is not null;