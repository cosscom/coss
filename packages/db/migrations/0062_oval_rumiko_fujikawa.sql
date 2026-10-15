CREATE TABLE "email_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"name" text NOT NULL,
	"alias" text,
	"description" text,
	"published_version" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sequence" bigint GENERATED ALWAYS AS IDENTITY (sequence name "email_template_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	CONSTRAINT "email_template_environment_alias_unique" UNIQUE("environment_id","alias"),
	CONSTRAINT "email_template_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "email_template_content" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"version_id" text NOT NULL,
	"locale" text NOT NULL,
	"subject" text NOT NULL,
	"html" text,
	"text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_template_content_version_locale_unique" UNIQUE("version_id","locale")
);
--> statement-breakpoint
CREATE TABLE "email_template_version" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" text NOT NULL,
	"version" integer,
	"default_locale" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sample_variables" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"has_unpublished_changes" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_template_version_template_version_unique" UNIQUE("template_id","version"),
	CONSTRAINT "email_template_version_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "template_id" text;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "template_version" integer;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "template_locale" text;--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_content" ADD CONSTRAINT "email_template_content_version_fk" FOREIGN KEY ("version_id","organization_id") REFERENCES "public"."email_template_version"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_version" ADD CONSTRAINT "email_template_version_template_fk" FOREIGN KEY ("template_id","organization_id") REFERENCES "public"."email_template"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_template_environment_created_at_idx" ON "email_template" USING btree ("environment_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "email_template_version_draft_unique" ON "email_template_version" USING btree ("template_id") WHERE "email_template_version"."version" is null;