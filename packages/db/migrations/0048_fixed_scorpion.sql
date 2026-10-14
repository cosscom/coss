CREATE TYPE "public"."received_email_status" AS ENUM('received', 'blocked');--> statement-breakpoint
CREATE TABLE "environment_inbound_address" (
	"environment_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "environment_inbound_address_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "inbound_drop_counter" (
	"organization_id" text NOT NULL,
	"day" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbound_drop_counter_pk" PRIMARY KEY("organization_id","day")
);
--> statement-breakpoint
CREATE TABLE "inbound_fake_object" (
	"key" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"content_type" text NOT NULL,
	"content" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "received_email" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"status" "received_email_status" NOT NULL,
	"blocked_reason" text,
	"provider" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"mail_from" text NOT NULL,
	"recipients" text[] NOT NULL,
	"from" text,
	"to" text[] DEFAULT '{}'::text[] NOT NULL,
	"cc" text[] DEFAULT '{}'::text[] NOT NULL,
	"reply_to" text[] DEFAULT '{}'::text[] NOT NULL,
	"subject" text,
	"message_id" text,
	"in_reply_to" text,
	"references" text[] DEFAULT '{}'::text[] NOT NULL,
	"sent_at" timestamp with time zone,
	"headers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"text" text,
	"html" text,
	"truncated" boolean DEFAULT false NOT NULL,
	"spam_verdict" text,
	"virus_verdict" text,
	"spf_verdict" text,
	"dkim_verdict" text,
	"dmarc_verdict" text,
	"dmarc_policy" text,
	"size" integer NOT NULL,
	"raw_key" text,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "received_email_provider_message_unique" UNIQUE("environment_id","provider","provider_message_id"),
	CONSTRAINT "received_email_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "received_email_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"received_email_id" text NOT NULL,
	"position" integer NOT NULL,
	"filename" text,
	"content_type" text NOT NULL,
	"content_id" text,
	"disposition" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"content_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "received_email_attachment_position_unique" UNIQUE("received_email_id","position")
);
--> statement-breakpoint
CREATE TABLE "receiving_domain" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"hostname" text NOT NULL,
	"record" jsonb NOT NULL,
	"last_checked_at" timestamp with time zone,
	"next_check_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receiving_domain_domain_unique" UNIQUE("domain_id"),
	CONSTRAINT "receiving_domain_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
ALTER TABLE "environment_inbound_address" ADD CONSTRAINT "environment_inbound_address_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_drop_counter" ADD CONSTRAINT "inbound_drop_counter_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "received_email" ADD CONSTRAINT "received_email_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "received_email_attachment" ADD CONSTRAINT "received_email_attachment_email_fk" FOREIGN KEY ("received_email_id","organization_id") REFERENCES "public"."received_email"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_domain" ADD CONSTRAINT "receiving_domain_domain_fk" FOREIGN KEY ("domain_id","organization_id") REFERENCES "public"."domain"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_domain" ADD CONSTRAINT "receiving_domain_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbound_fake_object_organization_idx" ON "inbound_fake_object" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inbound_fake_object_created_at_idx" ON "inbound_fake_object" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "received_email_environment_id_idx" ON "received_email" USING btree ("environment_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "received_email_created_at_idx" ON "received_email" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "received_email_organization_idx" ON "received_email" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "receiving_domain_environment_idx" ON "receiving_domain" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "receiving_domain_next_check_at_idx" ON "receiving_domain" USING btree ("next_check_at") WHERE "receiving_domain"."next_check_at" is not null;