CREATE TABLE "admin_audit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_email" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"organization_id" text,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_suspension" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"suspended_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_suspension" ADD CONSTRAINT "organization_suspension_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_suspension" ADD CONSTRAINT "organization_suspension_suspended_by_user_id_user_id_fk" FOREIGN KEY ("suspended_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_event_target_idx" ON "admin_audit_event" USING btree ("target_type","target_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_event_organization_idx" ON "admin_audit_event" USING btree ("organization_id","id" DESC NULLS LAST) WHERE "admin_audit_event"."organization_id" is not null;