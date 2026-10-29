CREATE TYPE "public"."inbox_kind" AS ENUM('managed', 'domain');--> statement-breakpoint
CREATE TYPE "public"."inbox_message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TABLE "inbox" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"kind" "inbox_kind" NOT NULL,
	"username" text NOT NULL,
	"domain" text NOT NULL,
	"address" text NOT NULL,
	"display_name" text,
	"client_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbox_address_unique" UNIQUE("address"),
	CONSTRAINT "inbox_environment_client_id_unique" UNIQUE("environment_id","client_id"),
	CONSTRAINT "inbox_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "inbox_message" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"inbox_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"direction" "inbox_message_direction" NOT NULL,
	"received_email_id" text,
	"email_id" text,
	"rfc_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbox_message_inbox_received_email_unique" UNIQUE("inbox_id","received_email_id"),
	CONSTRAINT "inbox_message_email_unique" UNIQUE("email_id"),
	CONSTRAINT "inbox_message_source_check" CHECK (("inbox_message"."direction" = 'inbound' and "inbox_message"."received_email_id" is not null and "inbox_message"."email_id" is null) or ("inbox_message"."direction" = 'outbound' and "inbox_message"."email_id" is not null and "inbox_message"."received_email_id" is null))
);
--> statement-breakpoint
CREATE TABLE "inbox_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"inbox_id" text NOT NULL,
	"subject" text,
	"normalized_subject" text NOT NULL,
	"participants" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_message_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbox_thread_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "inbox" ADD CONSTRAINT "inbox_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_message" ADD CONSTRAINT "inbox_message_thread_fk" FOREIGN KEY ("thread_id","organization_id") REFERENCES "public"."inbox_thread"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_message" ADD CONSTRAINT "inbox_message_received_email_fk" FOREIGN KEY ("received_email_id","organization_id") REFERENCES "public"."received_email"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_message" ADD CONSTRAINT "inbox_message_email_fk" FOREIGN KEY ("email_id","organization_id") REFERENCES "public"."email"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_thread" ADD CONSTRAINT "inbox_thread_inbox_fk" FOREIGN KEY ("inbox_id","organization_id") REFERENCES "public"."inbox"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbox_environment_id_idx" ON "inbox" USING btree ("environment_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inbox_organization_idx" ON "inbox" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inbox_message_thread_idx" ON "inbox_message" USING btree ("thread_id","id");--> statement-breakpoint
CREATE INDEX "inbox_message_inbox_id_idx" ON "inbox_message" USING btree ("inbox_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inbox_message_inbox_rfc_message_id_idx" ON "inbox_message" USING btree ("inbox_id","rfc_message_id") WHERE "inbox_message"."rfc_message_id" is not null;--> statement-breakpoint
CREATE INDEX "inbox_message_received_email_idx" ON "inbox_message" USING btree ("received_email_id");--> statement-breakpoint
CREATE INDEX "inbox_message_organization_idx" ON "inbox_message" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inbox_thread_inbox_last_message_idx" ON "inbox_thread" USING btree ("inbox_id","last_message_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inbox_thread_inbox_subject_idx" ON "inbox_thread" USING btree ("inbox_id","normalized_subject");--> statement-breakpoint
CREATE INDEX "inbox_thread_last_message_at_idx" ON "inbox_thread" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "inbox_thread_organization_idx" ON "inbox_thread" USING btree ("organization_id");