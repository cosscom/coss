CREATE TYPE "public"."form_captcha" AS ENUM('off', 'required');--> statement-breakpoint
CREATE TYPE "public"."form_delivery_kind" AS ENUM('notification', 'contact', 'verification');--> statement-breakpoint
CREATE TYPE "public"."form_delivery_state" AS ENUM('pending', 'delivered', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."form_on_review" AS ENUM('deliver', 'hold');--> statement-breakpoint
CREATE TYPE "public"."form_spam_reason" AS ENUM('honeypot', 'risk_block', 'risk_review', 'content');--> statement-breakpoint
CREATE TYPE "public"."form_submission_status" AS ENUM('pending_confirmation', 'accepted', 'held', 'spam');--> statement-breakpoint
ALTER TYPE "public"."contact_source" ADD VALUE 'form';--> statement-breakpoint
ALTER TYPE "public"."log_drain_source" ADD VALUE 'forms';--> statement-breakpoint
ALTER TYPE "public"."log_source" ADD VALUE 'forms';--> statement-breakpoint
CREATE TABLE "form" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"fields" jsonb,
	"strict_fields" boolean DEFAULT false NOT NULL,
	"allowed_origins" text[] DEFAULT '{}'::text[] NOT NULL,
	"redirect_url" text,
	"honeypot_field" text DEFAULT '_gotcha' NOT NULL,
	"captcha" "form_captcha" DEFAULT 'off' NOT NULL,
	"captcha_site_key" text,
	"on_review" "form_on_review" DEFAULT 'hold' NOT NULL,
	"content_threshold" double precision DEFAULT 0.9,
	"email_field" text DEFAULT 'email' NOT NULL,
	"verify_submitter" boolean DEFAULT false NOT NULL,
	"notify_recipients" text[] DEFAULT '{}'::text[] NOT NULL,
	"notification_from" text,
	"confirmation_from" text,
	"contacts" jsonb,
	"files" jsonb,
	"hosted" jsonb,
	"hosted_published_at" timestamp with time zone,
	"disabled_by_admin_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "form_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"kind" "form_delivery_kind" NOT NULL,
	"state" "form_delivery_state" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"last_error" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_delivery_submission_kind_unique" UNIQUE("submission_id","kind")
);
--> statement-breakpoint
CREATE TABLE "form_fake_object" (
	"key" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"content_type" text NOT NULL,
	"content" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_store_cleanup" (
	"key" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submission" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"form_id" text NOT NULL,
	"status" "form_submission_status" NOT NULL,
	"data" jsonb NOT NULL,
	"submitter_email" text,
	"ip" text,
	"user_agent" text,
	"origin" text,
	"referrer" text,
	"risk_assessment_id" text,
	"risk_decision" text,
	"risk_score" double precision,
	"spam_reason" "form_spam_reason",
	"confirmation_token_hash" text,
	"confirmation_expires_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"released_by" text,
	"usage_recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_submission_confirmation_token_unique" UNIQUE("confirmation_token_hash"),
	CONSTRAINT "form_submission_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "form_submission_file" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"field" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"store_key" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form" ADD CONSTRAINT "form_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_delivery" ADD CONSTRAINT "form_delivery_submission_fk" FOREIGN KEY ("submission_id","organization_id") REFERENCES "public"."form_submission"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submission" ADD CONSTRAINT "form_submission_form_fk" FOREIGN KEY ("form_id","organization_id") REFERENCES "public"."form"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submission_file" ADD CONSTRAINT "form_submission_file_submission_fk" FOREIGN KEY ("submission_id","organization_id") REFERENCES "public"."form_submission"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_environment_created_at_idx" ON "form" USING btree ("environment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "form_delivery_due_idx" ON "form_delivery" USING btree ("next_attempt_at") WHERE "form_delivery"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "form_fake_object_organization_idx" ON "form_fake_object" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "form_store_cleanup_next_attempt_at_idx" ON "form_store_cleanup" USING btree ("next_attempt_at");--> statement-breakpoint
CREATE INDEX "form_store_cleanup_organization_idx" ON "form_store_cleanup" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "form_submission_form_created_at_idx" ON "form_submission" USING btree ("form_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "form_submission_created_at_idx" ON "form_submission" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "form_submission_environment_idx" ON "form_submission" USING btree ("environment_id","organization_id");--> statement-breakpoint
CREATE INDEX "form_submission_file_submission_idx" ON "form_submission_file" USING btree ("submission_id");