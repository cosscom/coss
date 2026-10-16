CREATE TYPE "public"."contact_property_type" AS ENUM('string', 'number', 'boolean', 'date');--> statement-breakpoint
CREATE TYPE "public"."contact_source" AS ENUM('api', 'dashboard', 'import', 'preference_center');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('subscribed', 'unsubscribed', 'pending');--> statement-breakpoint
CREATE TYPE "public"."contact_topic_status" AS ENUM('opted_in', 'opted_out');--> statement-breakpoint
CREATE TYPE "public"."topic_default_subscription" AS ENUM('opt_in', 'opt_out');--> statement-breakpoint
CREATE TYPE "public"."topic_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "audience" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audience_environment_name_unique" UNIQUE("environment_id","name"),
	CONSTRAINT "audience_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "audience_member" (
	"audience_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audience_member_audience_id_contact_id_pk" PRIMARY KEY("audience_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" text PRIMARY KEY NOT NULL,
	"sequence" bigint GENERATED ALWAYS AS IDENTITY (sequence name "contact_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"address" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"status" "contact_status" DEFAULT 'subscribed' NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" "contact_source" NOT NULL,
	"subscribed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"pending_since" timestamp with time zone,
	"confirmation_sent_at" timestamp with time zone,
	"confirmation_count" integer DEFAULT 0 NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_environment_address_unique" UNIQUE("environment_id","address"),
	CONSTRAINT "contact_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "contact_counter" (
	"environment_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_counter_count_check" CHECK ("contact_counter"."count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "contact_property" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"key" text NOT NULL,
	"type" "contact_property_type" NOT NULL,
	"fallback" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_property_environment_key_unique" UNIQUE("environment_id","key")
);
--> statement-breakpoint
CREATE TABLE "contact_topic" (
	"contact_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"status" "contact_topic_status" NOT NULL,
	"source" "contact_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_topic_contact_id_topic_id_pk" PRIMARY KEY("contact_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "marketing_settings" (
	"environment_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"display_name" text,
	"mailing_address" text,
	"confirmation_from" text,
	"confirmation_subject" text,
	"confirmation_html" text,
	"confirmation_text" text,
	"confirmed_redirect_url" text,
	"double_opt_in_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"name" text NOT NULL,
	"filter" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "segment_environment_name_unique" UNIQUE("environment_id","name")
);
--> statement-breakpoint
CREATE TABLE "topic" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_subscription" "topic_default_subscription" NOT NULL,
	"visibility" "topic_visibility" DEFAULT 'public' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_environment_key_unique" UNIQUE("environment_id","key"),
	CONSTRAINT "topic_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "audience" ADD CONSTRAINT "audience_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_member" ADD CONSTRAINT "audience_member_audience_fk" FOREIGN KEY ("audience_id","organization_id") REFERENCES "public"."audience"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_member" ADD CONSTRAINT "audience_member_contact_fk" FOREIGN KEY ("contact_id","organization_id") REFERENCES "public"."contact"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_counter" ADD CONSTRAINT "contact_counter_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_property" ADD CONSTRAINT "contact_property_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_topic" ADD CONSTRAINT "contact_topic_contact_fk" FOREIGN KEY ("contact_id","organization_id") REFERENCES "public"."contact"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_topic" ADD CONSTRAINT "contact_topic_topic_fk" FOREIGN KEY ("topic_id","organization_id") REFERENCES "public"."topic"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_settings" ADD CONSTRAINT "marketing_settings_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment" ADD CONSTRAINT "segment_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic" ADD CONSTRAINT "topic_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audience_member_contact_idx" ON "audience_member" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_environment_sequence_idx" ON "contact" USING btree ("environment_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contact_environment_id_idx" ON "contact" USING btree ("environment_id","id");--> statement-breakpoint
CREATE INDEX "contact_properties_idx" ON "contact" USING gin ("properties" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "contact_pending_since_idx" ON "contact" USING btree ("pending_since") WHERE "contact"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "contact_topic_topic_status_idx" ON "contact_topic" USING btree ("topic_id","status","contact_id");