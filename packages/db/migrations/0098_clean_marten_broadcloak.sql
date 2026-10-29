CREATE TYPE "public"."email_subaccount_reputation" AS ENUM('good', 'warning', 'paused');--> statement-breakpoint
CREATE TYPE "public"."email_subaccount_status" AS ENUM('active', 'disabled', 'deleting');--> statement-breakpoint
CREATE TABLE "email_subaccount" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"uid" text,
	"name" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "email_subaccount_status" DEFAULT 'active' NOT NULL,
	"daily_recipient_limit" integer,
	"per_second_recipient_limit" integer,
	"per_second_burst" integer,
	"reputation_status" "email_subaccount_reputation" DEFAULT 'good' NOT NULL,
	"reputation_trigger" text,
	"reputation_changed_at" timestamp with time zone,
	"reinstated_at" timestamp with time zone,
	"metrics" jsonb,
	"revision" integer DEFAULT 0 NOT NULL,
	"next_evaluation_at" timestamp with time zone,
	"evaluation_lease_until" timestamp with time zone,
	"deletion_lease_until" timestamp with time zone,
	"deletion_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_subaccount_environment_uid_unique" UNIQUE("environment_id","uid"),
	CONSTRAINT "email_subaccount_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "email_subaccount" ADD CONSTRAINT "email_subaccount_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_subaccount_environment_created_at_idx" ON "email_subaccount" USING btree ("environment_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "email_subaccount_next_evaluation_idx" ON "email_subaccount" USING btree ("next_evaluation_at") WHERE "email_subaccount"."next_evaluation_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "email_subaccount_deleting_idx" ON "email_subaccount" USING btree ("deletion_lease_until") WHERE "email_subaccount"."status" = 'deleting';