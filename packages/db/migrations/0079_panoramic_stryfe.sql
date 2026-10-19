CREATE TABLE "email_storage_settings" (
	"environment_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"store_content" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "store_content" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "content_discarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_storage_settings" ADD CONSTRAINT "email_storage_settings_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;