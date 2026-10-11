CREATE TABLE "email_reputation_rollup" (
	"organization_id" text NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"computed_revision" integer,
	"recipients" integer DEFAULT 0 NOT NULL,
	"bounces" integer DEFAULT 0 NOT NULL,
	"complaints" integer DEFAULT 0 NOT NULL,
	"simulator_recipients" integer DEFAULT 0 NOT NULL,
	"simulator_bounces" integer DEFAULT 0 NOT NULL,
	"simulator_complaints" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_reputation_rollup_organization_id_bucket_start_pk" PRIMARY KEY("organization_id","bucket_start")
);
--> statement-breakpoint
ALTER TABLE "email_reputation_rollup" ADD CONSTRAINT "email_reputation_rollup_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;