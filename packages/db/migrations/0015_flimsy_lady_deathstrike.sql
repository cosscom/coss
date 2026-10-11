CREATE TYPE "public"."reputation_actor" AS ENUM('system', 'admin');--> statement-breakpoint
CREATE TYPE "public"."reputation_event_type" AS ENUM('warning_raised', 'warning_cleared', 'suspended', 'reinstated', 'policy_updated');--> statement-breakpoint
CREATE TYPE "public"."reputation_status" AS ENUM('good', 'warning', 'suspended');--> statement-breakpoint
CREATE TABLE "reputation_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" "reputation_event_type" NOT NULL,
	"trigger" text NOT NULL,
	"actor" "reputation_actor" NOT NULL,
	"actor_user_id" text,
	"note" text,
	"metrics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reputation_standing" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"status" "reputation_status" DEFAULT 'good' NOT NULL,
	"reason" text,
	"status_changed_at" timestamp with time zone,
	"reinstated_at" timestamp with time zone,
	"policy_overrides" jsonb,
	"metrics" jsonb,
	"last_evaluated_at" timestamp with time zone,
	"revision" integer DEFAULT 0 NOT NULL,
	"evaluation_lease_until" timestamp with time zone,
	"next_evaluation_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reputation_event" ADD CONSTRAINT "reputation_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_event" ADD CONSTRAINT "reputation_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_standing" ADD CONSTRAINT "reputation_standing_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reputation_event_organization_created_at_idx" ON "reputation_event" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reputation_standing_next_evaluation_idx" ON "reputation_standing" USING btree ("next_evaluation_at") WHERE "reputation_standing"."next_evaluation_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "email_organization_created_at_idx" ON "email" USING btree ("organization_id","created_at");