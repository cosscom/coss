CREATE TYPE "public"."sms_account_status" AS ENUM('active', 'closing', 'closed');--> statement-breakpoint
CREATE TYPE "public"."sms_event_type" AS ENUM('sms.scheduled', 'sms.sent', 'sms.delivered', 'sms.undelivered', 'sms.failed', 'sms.suppressed', 'sms.canceled');--> statement-breakpoint
CREATE TYPE "public"."sms_number_kind" AS ENUM('local', 'toll_free');--> statement-breakpoint
CREATE TYPE "public"."sms_number_status" AS ENUM('pending', 'active', 'releasing');--> statement-breakpoint
CREATE TYPE "public"."sms_registration_kind" AS ENUM('us_10dlc', 'toll_free');--> statement-breakpoint
CREATE TYPE "public"."sms_registration_status" AS ENUM('draft', 'submitted', 'in_review', 'approved', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sms_status" AS ENUM('queued', 'scheduled', 'sent', 'delivered', 'undelivered', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."sms_suppression_reason" AS ENUM('opt_out', 'manual', 'invalid_number');--> statement-breakpoint
ALTER TYPE "public"."log_drain_source" ADD VALUE 'sms';--> statement-breakpoint
ALTER TYPE "public"."log_source" ADD VALUE 'sms';--> statement-breakpoint
CREATE TABLE "sms_account" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"provider" text,
	"subaccount_sid" text,
	"auth_token" text,
	"status" "sms_account_status" DEFAULT 'active' NOT NULL,
	"allowed_countries" text[] DEFAULT '{US,CA}'::text[] NOT NULL,
	"unlocked_countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_account_subaccount_sid_unique" UNIQUE("subaccount_sid")
);
--> statement-breakpoint
CREATE TABLE "sms_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"message_id" text NOT NULL,
	"type" "sms_event_type" NOT NULL,
	"provider" text NOT NULL,
	"provider_status" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"dedupe_key" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_event_message_dedupe_unique" UNIQUE("message_id","dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "sms_message" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"status" "sms_status" DEFAULT 'queued' NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"to_country" text NOT NULL,
	"number_id" text,
	"body" text NOT NULL,
	"encoding" text NOT NULL,
	"segments" integer NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"provider" text,
	"provider_message_id" text,
	"error_code" text,
	"error_message" text,
	"idempotency_key" text,
	"request_hash" text,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"usage_recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_message_environment_idempotency_key_unique" UNIQUE("environment_id","idempotency_key"),
	CONSTRAINT "sms_message_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "sms_number" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"kind" "sms_number_kind" NOT NULL,
	"country" text NOT NULL,
	"provider" text NOT NULL,
	"provider_sid" text,
	"status" "sms_number_status" DEFAULT 'pending' NOT NULL,
	"registration_id" text,
	"receiving_environment_id" text,
	"next_fee_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_number_phone_number_unique" UNIQUE("phone_number"),
	CONSTRAINT "sms_number_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "sms_received" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"number_id" text,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"body" text NOT NULL,
	"segments" integer NOT NULL,
	"country" text NOT NULL,
	"keyword" text,
	"provider" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"usage_recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_received_provider_message_unique" UNIQUE("provider","provider_message_id")
);
--> statement-breakpoint
CREATE TABLE "sms_registration" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"kind" "sms_registration_kind" NOT NULL,
	"status" "sms_registration_status" DEFAULT 'draft' NOT NULL,
	"step" text,
	"brand_type" text,
	"profile" jsonb NOT NULL,
	"campaign" jsonb NOT NULL,
	"customer_profile_sid" text,
	"trust_product_sid" text,
	"brand_sid" text,
	"messaging_service_sid" text,
	"campaign_sid" text,
	"toll_free_verification_sid" text,
	"number_id" text,
	"rejection_reason" text,
	"next_check_at" timestamp with time zone,
	"next_fee_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_registration_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "sms_suppression" (
	"id" text PRIMARY KEY NOT NULL,
	"sequence" bigint GENERATED ALWAYS AS IDENTITY (sequence name "sms_suppression_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"reason" "sms_suppression_reason" NOT NULL,
	"message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_suppression_environment_phone_unique" UNIQUE("environment_id","phone_number")
);
--> statement-breakpoint
ALTER TABLE "sms_account" ADD CONSTRAINT "sms_account_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_event" ADD CONSTRAINT "sms_event_message_fk" FOREIGN KEY ("message_id","organization_id") REFERENCES "public"."sms_message"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_message" ADD CONSTRAINT "sms_message_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_number" ADD CONSTRAINT "sms_number_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_received" ADD CONSTRAINT "sms_received_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_registration" ADD CONSTRAINT "sms_registration_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_suppression" ADD CONSTRAINT "sms_suppression_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sms_event_message_occurred_at_idx" ON "sms_event" USING btree ("message_id","occurred_at");--> statement-breakpoint
CREATE INDEX "sms_message_environment_created_at_idx" ON "sms_message" USING btree ("environment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sms_message_organization_send_time_idx" ON "sms_message" USING btree ("organization_id",coalesce("sent_at", "created_at"));--> statement-breakpoint
CREATE INDEX "sms_message_scheduled_due_idx" ON "sms_message" USING btree ("scheduled_at") WHERE "sms_message"."status" = 'scheduled';--> statement-breakpoint
CREATE INDEX "sms_message_queued_created_at_idx" ON "sms_message" USING btree ("created_at") WHERE "sms_message"."status" = 'queued';--> statement-breakpoint
CREATE INDEX "sms_message_created_at_idx" ON "sms_message" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sms_number_organization_idx" ON "sms_number" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sms_number_next_fee_idx" ON "sms_number" USING btree ("next_fee_at") WHERE "sms_number"."next_fee_at" is not null;--> statement-breakpoint
CREATE INDEX "sms_received_environment_created_at_idx" ON "sms_received" USING btree ("environment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sms_received_created_at_idx" ON "sms_received" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sms_registration_organization_idx" ON "sms_registration" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sms_registration_next_check_idx" ON "sms_registration" USING btree ("next_check_at") WHERE "sms_registration"."next_check_at" is not null;--> statement-breakpoint
CREATE INDEX "sms_suppression_environment_sequence_idx" ON "sms_suppression" USING btree ("environment_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST);