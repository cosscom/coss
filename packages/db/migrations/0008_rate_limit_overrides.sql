CREATE TABLE "rate_limit_override" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"bucket" text NOT NULL,
	"limit" integer NOT NULL,
	"period_ms" integer NOT NULL,
	"burst" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_override_organization_bucket_unique" UNIQUE("organization_id","bucket")
);
--> statement-breakpoint
ALTER TABLE "rate_limit_override" ADD CONSTRAINT "rate_limit_override_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;