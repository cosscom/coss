CREATE TYPE "public"."dmarc_notification_kind" AS ENUM('ready_quarantine', 'ready_reject', 'pass_rate_dropped');--> statement-breakpoint
CREATE TYPE "public"."dmarc_notification_status" AS ENUM('pending', 'sent', 'skipped', 'failed');--> statement-breakpoint
CREATE TABLE "dmarc_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"kind" "dmarc_notification_kind" NOT NULL,
	"dedupe_key" text NOT NULL,
	"policy_changed_at" timestamp with time zone,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "dmarc_notification_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"recipients" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dmarc_notification_dedupe_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "dmarc_report" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"reporter_org" text NOT NULL,
	"reporter_email" text,
	"report_id" text NOT NULL,
	"period_begin" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"policy_published" jsonb NOT NULL,
	"message_count" integer NOT NULL,
	"pass_count" integer NOT NULL,
	"truncated" boolean DEFAULT false NOT NULL,
	"provider" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dmarc_report_reporter_unique" UNIQUE("domain_id","reporter_org","report_id"),
	CONSTRAINT "dmarc_report_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "dmarc_report_record" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"dmarc_report_id" text NOT NULL,
	"period_begin" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"source_ip" text NOT NULL,
	"count" integer NOT NULL,
	"disposition" text NOT NULL,
	"dkim" text NOT NULL,
	"spf" text NOT NULL,
	"dmarc_pass" boolean NOT NULL,
	"header_from" text NOT NULL,
	"envelope_from" text,
	"auth_results" jsonb NOT NULL,
	"reasons" jsonb NOT NULL,
	"via_coss" boolean NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "dmarc_report_token" text;--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "dmarc_record" text;--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "dmarc_inherited_record" text;--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "dmarc_policy_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dmarc_notification" ADD CONSTRAINT "dmarc_notification_domain_fk" FOREIGN KEY ("domain_id","organization_id") REFERENCES "public"."domain"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dmarc_report" ADD CONSTRAINT "dmarc_report_domain_fk" FOREIGN KEY ("domain_id","organization_id") REFERENCES "public"."domain"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dmarc_report_record" ADD CONSTRAINT "dmarc_report_record_report_fk" FOREIGN KEY ("dmarc_report_id","organization_id") REFERENCES "public"."dmarc_report"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dmarc_notification_due_idx" ON "dmarc_notification" USING btree ("next_attempt_at") WHERE "dmarc_notification"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "dmarc_notification_created_at_idx" ON "dmarc_notification" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "dmarc_report_domain_period_idx" ON "dmarc_report" USING btree ("domain_id","period_end");--> statement-breakpoint
CREATE INDEX "dmarc_report_domain_id_idx" ON "dmarc_report" USING btree ("domain_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "dmarc_report_created_at_idx" ON "dmarc_report" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "dmarc_report_organization_idx" ON "dmarc_report" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dmarc_report_record_report_idx" ON "dmarc_report_record" USING btree ("dmarc_report_id","position");--> statement-breakpoint
CREATE INDEX "dmarc_report_record_domain_period_idx" ON "dmarc_report_record" USING btree ("domain_id","period_end");--> statement-breakpoint
CREATE INDEX "dmarc_report_record_organization_idx" ON "dmarc_report_record" USING btree ("organization_id");