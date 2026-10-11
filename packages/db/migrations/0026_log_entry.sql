CREATE TYPE "public"."log_level" AS ENUM('info', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."log_source" AS ENUM('api', 'email', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."org_audit_actor_type" AS ENUM('user', 'api_key', 'system');--> statement-breakpoint
CREATE TABLE "log_entry" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"source" "log_source" NOT NULL,
	"level" "log_level" NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"request_id" text,
	"api_key_id" text,
	"method" text,
	"path" text,
	"route" text,
	"status_code" integer,
	"duration_ms" integer,
	"client_ip" text,
	"user_agent" text,
	"error_code" text,
	"resource_type" text,
	"resource_id" text,
	"recipient" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	CONSTRAINT "log_entry_pkey" PRIMARY KEY("occurred_at","id")
);
--> statement-breakpoint
CREATE TABLE "org_audit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"environment_id" text,
	"actor_type" "org_audit_actor_type" NOT NULL,
	"actor_id" text,
	"actor_label" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"target_label" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "log_entry" ADD CONSTRAINT "log_entry_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_audit_event" ADD CONSTRAINT "org_audit_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "log_entry_environment_occurred_at_idx" ON "log_entry" USING btree ("environment_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "log_entry_environment_request_idx" ON "log_entry" USING btree ("environment_id","request_id") WHERE "log_entry"."request_id" is not null;--> statement-breakpoint
CREATE INDEX "log_entry_environment_resource_idx" ON "log_entry" USING btree ("environment_id","resource_id") WHERE "log_entry"."resource_id" is not null;--> statement-breakpoint
CREATE INDEX "log_entry_search_text_idx" ON "log_entry" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "org_audit_event_organization_idx" ON "org_audit_event" USING btree ("organization_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "org_audit_event_organization_action_idx" ON "org_audit_event" USING btree ("organization_id","action","id" DESC NULLS LAST);