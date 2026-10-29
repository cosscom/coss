CREATE TYPE "public"."verify_channel" AS ENUM('sms', 'email');--> statement-breakpoint
CREATE TYPE "public"."verify_send_route" AS ENUM('own_number', 'shared_number', 'email', 'coss_email');--> statement-breakpoint
CREATE TYPE "public"."verify_status" AS ENUM('pending', 'approved', 'expired', 'canceled', 'failed', 'blocked');--> statement-breakpoint
ALTER TYPE "public"."log_drain_source" ADD VALUE 'verify';--> statement-breakpoint
ALTER TYPE "public"."log_source" ADD VALUE 'verify';--> statement-breakpoint
CREATE TABLE "verify_check" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"request_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"valid" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verify_check_request_idempotency_key_unique" UNIQUE("request_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "verify_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"api_key_owner_id" text,
	"channel" "verify_channel" NOT NULL,
	"to" text NOT NULL,
	"to_country" text,
	"status" "verify_status" DEFAULT 'pending' NOT NULL,
	"failure_code" text,
	"risk_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"code_hash" text,
	"code_length" integer NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer NOT NULL,
	"sends" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"usage_recorded_at" timestamp with time zone,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"idempotency_key" text,
	"request_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verify_request_environment_idempotency_key_unique" UNIQUE("environment_id","idempotency_key"),
	CONSTRAINT "verify_request_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "verify_send" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"request_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"channel" "verify_channel" NOT NULL,
	"route" "verify_send_route" NOT NULL,
	"sms_id" text,
	"email_id" text,
	"message_environment_id" text,
	"api_key_id" text,
	"api_key_owner_id" text,
	"country" text,
	"usage_recorded_at" timestamp with time zone,
	"idempotency_key" text,
	"request_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verify_send_request_sequence_unique" UNIQUE("request_id","sequence"),
	CONSTRAINT "verify_send_environment_idempotency_key_unique" UNIQUE("environment_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "verify_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"app_name" text,
	"code_length" integer DEFAULT 6 NOT NULL,
	"ttl_seconds" integer DEFAULT 600 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"sms_from" text,
	"email_from" text,
	"allowed_countries" text[] DEFAULT '{US,CA}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verify_settings_environment_unique" UNIQUE("environment_id")
);
--> statement-breakpoint
ALTER TABLE "sms_message" ADD COLUMN "discard_body" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "verify_check" ADD CONSTRAINT "verify_check_request_fk" FOREIGN KEY ("request_id","organization_id") REFERENCES "public"."verify_request"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verify_request" ADD CONSTRAINT "verify_request_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verify_send" ADD CONSTRAINT "verify_send_request_fk" FOREIGN KEY ("request_id","organization_id") REFERENCES "public"."verify_request"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verify_settings" ADD CONSTRAINT "verify_settings_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verify_request_environment_created_at_idx" ON "verify_request" USING btree ("environment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "verify_request_pending_to_idx" ON "verify_request" USING btree ("environment_id","to","channel") WHERE "verify_request"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "verify_request_created_at_idx" ON "verify_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "verify_send_unmetered_idx" ON "verify_send" USING btree ("created_at") WHERE "verify_send"."route" = 'shared_number' and "verify_send"."usage_recorded_at" is null;