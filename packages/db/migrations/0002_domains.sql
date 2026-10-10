CREATE TYPE "public"."domain_status" AS ENUM('pending', 'verified', 'temporary_failure', 'failed', 'deleting');--> statement-breakpoint
CREATE TYPE "public"."mail_from_status" AS ENUM('pending', 'success', 'temporary_failure', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tenant_sending_status" AS ENUM('enabled', 'disabled', 'reinstated');--> statement-breakpoint
CREATE TABLE "domain" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "domain_status" DEFAULT 'pending' NOT NULL,
	"can_send" boolean DEFAULT false NOT NULL,
	"provider" text NOT NULL,
	"region" text,
	"dkim_tokens" text[] DEFAULT '{}'::text[] NOT NULL,
	"dkim_hosted_zone" text,
	"mail_from_domain" text NOT NULL,
	"mail_from_status" "mail_from_status" DEFAULT 'pending' NOT NULL,
	"records" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone,
	"next_check_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "email_tenant" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"tenant_name" text NOT NULL,
	"tenant_arn" text,
	"sending_status" "tenant_sending_status" DEFAULT 'enabled' NOT NULL,
	"status_cause" text,
	"status_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_tenant_name_unique" UNIQUE("tenant_name")
);
--> statement-breakpoint
ALTER TABLE "domain" ADD CONSTRAINT "domain_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain" ADD CONSTRAINT "domain_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tenant" ADD CONSTRAINT "email_tenant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "domain_name_active_unique" ON "domain" USING btree ("name") WHERE "domain"."status" <> 'failed';--> statement-breakpoint
CREATE INDEX "domain_organization_idx" ON "domain" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "domain_next_check_at_idx" ON "domain" USING btree ("next_check_at") WHERE "domain"."next_check_at" is not null;