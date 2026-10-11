CREATE TABLE "organization_api_version" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"api_version" text NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Existing endpoints get the only API version there was (the first one). The default only fills them in.
ALTER TABLE "webhook_endpoint" ADD COLUMN "api_version" text NOT NULL DEFAULT '2026-10-10';--> statement-breakpoint
ALTER TABLE "webhook_endpoint" ALTER COLUMN "api_version" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organization_api_version" ADD CONSTRAINT "organization_api_version_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_api_version" ADD CONSTRAINT "organization_api_version_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;