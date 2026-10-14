CREATE TYPE "public"."risk_decision" AS ENUM('allow', 'review', 'block');--> statement-breakpoint
CREATE TYPE "public"."risk_event" AS ENUM('signup', 'login', 'message', 'checkout', 'custom');--> statement-breakpoint
CREATE TYPE "public"."risk_feedback_source" AS ENUM('api', 'dashboard');--> statement-breakpoint
CREATE TYPE "public"."risk_identity_kind" AS ENUM('mailbox');--> statement-breakpoint
CREATE TYPE "public"."risk_list" AS ENUM('allow', 'block');--> statement-breakpoint
CREATE TYPE "public"."risk_list_entry_type" AS ENUM('email', 'domain', 'ip', 'asn', 'country', 'user');--> statement-breakpoint
CREATE TYPE "public"."risk_outcome" AS ENUM('legitimate', 'fraud', 'abuse');--> statement-breakpoint
CREATE TYPE "public"."risk_report_kind" AS ENUM('mailbox', 'ip', 'subnet', 'user');--> statement-breakpoint
CREATE TYPE "public"."risk_review_status" AS ENUM('open', 'resolved');--> statement-breakpoint
ALTER TYPE "public"."log_drain_source" ADD VALUE 'risk' BEFORE 'audit';--> statement-breakpoint
ALTER TYPE "public"."log_source" ADD VALUE 'risk';--> statement-breakpoint
CREATE TABLE "risk_assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"sequence" bigint GENERATED ALWAYS AS IDENTITY (sequence name "risk_assessment_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"event" "risk_event" NOT NULL,
	"event_name" text,
	"user_id" text,
	"email" text,
	"ip" "inet",
	"user_agent" text,
	"email_hash" text,
	"ip_hash" text,
	"subnet_hash" text,
	"decision" "risk_decision" NOT NULL,
	"score" real NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"degraded" text[] DEFAULT '{}'::text[] NOT NULL,
	"outcome" "risk_outcome",
	"outcome_at" timestamp with time zone,
	"review_status" "risk_review_status",
	"idempotency_key" text,
	"request_hash" text,
	"personal_data_purged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_assessment_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "risk_assessment_environment_idempotency_key_unique" UNIQUE("environment_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "risk_dataset" (
	"name" text PRIMARY KEY NOT NULL,
	"sha256" text NOT NULL,
	"entries" integer NOT NULL,
	"content" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"assessment_id" text NOT NULL,
	"outcome" "risk_outcome" NOT NULL,
	"source" "risk_feedback_source" NOT NULL,
	"actor_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_identity" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"kind" "risk_identity_kind" NOT NULL,
	"value_hash" text NOT NULL,
	"user_id" text,
	"assessment_id" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_identity_value_user_unique" UNIQUE NULLS NOT DISTINCT("environment_id","kind","value_hash","user_id")
);
--> statement-breakpoint
CREATE TABLE "risk_list_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"sequence" bigint GENERATED ALWAYS AS IDENTITY (sequence name "risk_list_entry_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"list" "risk_list" NOT NULL,
	"type" "risk_list_entry_type" NOT NULL,
	"value" text NOT NULL,
	"network" "cidr",
	"note" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_list_entry_value_unique" UNIQUE("environment_id","list","type","value")
);
--> statement-breakpoint
CREATE TABLE "risk_report" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"kind" "risk_report_kind" NOT NULL,
	"value_hash" text NOT NULL,
	"assessment_id" text NOT NULL,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_report_value_unique" UNIQUE("environment_id","kind","value_hash","assessment_id")
);
--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD CONSTRAINT "risk_assessment_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_feedback" ADD CONSTRAINT "risk_feedback_assessment_fk" FOREIGN KEY ("assessment_id","organization_id") REFERENCES "public"."risk_assessment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_identity" ADD CONSTRAINT "risk_identity_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_list_entry" ADD CONSTRAINT "risk_list_entry_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_report" ADD CONSTRAINT "risk_report_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "risk_assessment_environment_sequence_idx" ON "risk_assessment" USING btree ("environment_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "risk_assessment_environment_user_idx" ON "risk_assessment" USING btree ("environment_id","user_id") WHERE "risk_assessment"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "risk_assessment_open_review_idx" ON "risk_assessment" USING btree ("environment_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST) WHERE "risk_assessment"."review_status" = 'open';--> statement-breakpoint
CREATE INDEX "risk_assessment_created_at_idx" ON "risk_assessment" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "risk_assessment_personal_data_idx" ON "risk_assessment" USING btree ("created_at") WHERE "risk_assessment"."personal_data_purged_at" is null;--> statement-breakpoint
CREATE INDEX "risk_feedback_assessment_idx" ON "risk_feedback" USING btree ("assessment_id","created_at");--> statement-breakpoint
CREATE INDEX "risk_identity_environment_user_idx" ON "risk_identity" USING btree ("environment_id","user_id") WHERE "risk_identity"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "risk_identity_last_seen_idx" ON "risk_identity" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "risk_list_entry_environment_sequence_idx" ON "risk_list_entry" USING btree ("environment_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "risk_list_entry_network_idx" ON "risk_list_entry" USING gist ("network" inet_ops) WHERE "risk_list_entry"."network" is not null;--> statement-breakpoint
CREATE INDEX "risk_report_assessment_idx" ON "risk_report" USING btree ("environment_id","assessment_id");--> statement-breakpoint
CREATE INDEX "risk_report_reported_at_idx" ON "risk_report" USING btree ("reported_at");