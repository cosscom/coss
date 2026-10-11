CREATE TYPE "public"."tracking_domain_status" AS ENUM('pending', 'active', 'temporary_failure', 'failed', 'deleting');--> statement-breakpoint
CREATE TABLE "tracking_domain" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"hostname" text NOT NULL,
	"status" "tracking_domain_status" DEFAULT 'pending' NOT NULL,
	"provider" text NOT NULL,
	"provider_hostname_id" text,
	"record" jsonb NOT NULL,
	"provider_message" text,
	"verification_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone,
	"next_check_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracking_domain_domain_unique" UNIQUE("domain_id")
);
--> statement-breakpoint
ALTER TABLE "tracking_domain" ADD CONSTRAINT "tracking_domain_domain_fk" FOREIGN KEY ("domain_id","organization_id") REFERENCES "public"."domain"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tracking_domain_hostname_active_unique" ON "tracking_domain" USING btree ("hostname") WHERE "tracking_domain"."status" <> 'failed';--> statement-breakpoint
CREATE INDEX "tracking_domain_next_check_at_idx" ON "tracking_domain" USING btree ("next_check_at") WHERE "tracking_domain"."next_check_at" is not null;