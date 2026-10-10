CREATE TYPE "public"."email_suppression_reason" AS ENUM('bounce', 'complaint', 'manual');--> statement-breakpoint
ALTER TYPE "public"."email_event_type" ADD VALUE 'email.suppressed';--> statement-breakpoint
CREATE TABLE "email_suppression" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"address" text NOT NULL,
	"scope" text NOT NULL,
	"reason" "email_suppression_reason" NOT NULL,
	"email_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_suppression_environment_address_scope_unique" UNIQUE("environment_id","address","scope")
);
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "email_tenant" ADD COLUMN "suppression_migrated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_suppression" ADD CONSTRAINT "email_suppression_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_suppression_environment_id_idx" ON "email_suppression" USING btree ("environment_id","id" DESC NULLS LAST);