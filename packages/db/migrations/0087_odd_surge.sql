CREATE TYPE "public"."migration_item_kind" AS ENUM('domain', 'property', 'topic', 'audience', 'template', 'webhook_endpoint');--> statement-breakpoint
CREATE TYPE "public"."migration_item_outcome" AS ENUM('pending', 'created', 'existing', 'skipped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."migration_provider" AS ENUM('resend', 'sendgrid', 'postmark');--> statement-breakpoint
CREATE TYPE "public"."migration_status" AS ENUM('inspecting', 'ready', 'queued', 'running', 'completed', 'failed', 'canceled');--> statement-breakpoint
CREATE TABLE "migration" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"provider" "migration_provider" NOT NULL,
	"status" "migration_status" DEFAULT 'inspecting' NOT NULL,
	"credentials_ciphertext" text,
	"credential_hint" text NOT NULL,
	"source" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"inventory" jsonb,
	"selection" jsonb,
	"phase" text,
	"cursor" jsonb,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lease_until" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_by_user_id" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "migration_item" (
	"id" text PRIMARY KEY NOT NULL,
	"migration_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"kind" "migration_item_kind" NOT NULL,
	"source_id" text NOT NULL,
	"source_name" text NOT NULL,
	"target_id" text,
	"target_name" text,
	"outcome" "migration_item_outcome" DEFAULT 'pending' NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"message" text,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_item_source_unique" UNIQUE("migration_id","kind","source_id")
);
--> statement-breakpoint
ALTER TABLE "migration" ADD CONSTRAINT "migration_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration" ADD CONSTRAINT "migration_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_item" ADD CONSTRAINT "migration_item_migration_fk" FOREIGN KEY ("migration_id","organization_id") REFERENCES "public"."migration"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "migration_environment_created_at_idx" ON "migration" USING btree ("environment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "migration_due_idx" ON "migration" USING btree ("next_run_at") WHERE "migration"."status" in ('inspecting', 'queued', 'running');