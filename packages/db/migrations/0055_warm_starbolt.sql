CREATE TYPE "public"."risk_limit_failure_mode" AS ENUM('allow', 'deny');--> statement-breakpoint
CREATE TABLE "risk_limit_bucket" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"name" text NOT NULL,
	"limit" integer NOT NULL,
	"period_ms" integer NOT NULL,
	"burst" integer NOT NULL,
	"on_failure" "risk_limit_failure_mode" DEFAULT 'allow' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_limit_bucket_name_unique" UNIQUE("environment_id","name"),
	CONSTRAINT "risk_limit_bucket_values_check" CHECK ("risk_limit_bucket"."limit" > 0 and "risk_limit_bucket"."period_ms" > 0 and "risk_limit_bucket"."burst" > 0)
);
--> statement-breakpoint
ALTER TABLE "risk_settings" ADD COLUMN "content_thresholds" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "risk_limit_bucket" ADD CONSTRAINT "risk_limit_bucket_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;