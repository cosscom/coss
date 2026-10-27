CREATE TYPE "public"."sign_authentication" AS ENUM('email_link', 'customer_asserted');--> statement-breakpoint
CREATE TYPE "public"."sign_delivery" AS ENUM('embedded', 'email');--> statement-breakpoint
CREATE TYPE "public"."sign_event_type" AS ENUM('created', 'sent', 'notified', 'viewed', 'consented', 'signed', 'declined', 'reminded', 'canceled', 'expired', 'completed');--> statement-breakpoint
CREATE TYPE "public"."sign_field_type" AS ENUM('signature', 'initials', 'date_signed', 'name', 'email', 'text', 'checkbox');--> statement-breakpoint
CREATE TYPE "public"."sign_request_status" AS ENUM('draft', 'sent', 'completed', 'declined', 'canceled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."sign_signer_status" AS ENUM('pending', 'notified', 'viewed', 'signed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."sign_signing_order" AS ENUM('parallel', 'sequential');--> statement-breakpoint
CREATE TABLE "sign_document" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"filename" text NOT NULL,
	"store_key" text NOT NULL,
	"sha256" text NOT NULL,
	"size" integer NOT NULL,
	"pages" jsonb NOT NULL,
	"anchors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_document_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "sign_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"request_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"type" "sign_event_type" NOT NULL,
	"signer_id" text,
	"actor" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"previous_hash" text,
	"hash" text NOT NULL,
	CONSTRAINT "sign_event_request_sequence_unique" UNIQUE("request_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "sign_fake_object" (
	"key" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"content_type" text NOT NULL,
	"content" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sign_field" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"request_id" text NOT NULL,
	"signer_id" text NOT NULL,
	"document_id" text NOT NULL,
	"type" "sign_field_type" NOT NULL,
	"page" integer NOT NULL,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	"width" double precision NOT NULL,
	"height" double precision NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"label" text,
	"anchor" text,
	"value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sign_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"status" "sign_request_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"signing_order" "sign_signing_order" DEFAULT 'parallel' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" text,
	"request_hash" text,
	"expires_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_request_environment_idempotency_key_unique" UNIQUE("environment_id","idempotency_key"),
	CONSTRAINT "sign_request_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "sign_request_document" (
	"request_id" text NOT NULL,
	"document_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "sign_request_document_request_id_position_pk" PRIMARY KEY("request_id","position"),
	CONSTRAINT "sign_request_document_unique" UNIQUE("request_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "sign_signer" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"request_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"position" integer NOT NULL,
	"delivery" "sign_delivery" NOT NULL,
	"authentication" "sign_authentication" NOT NULL,
	"status" "sign_signer_status" DEFAULT 'pending' NOT NULL,
	"client_ref" text,
	"viewed_at" timestamp with time zone,
	"consented_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"decline_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_signer_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "sign_signer_request_email_unique" UNIQUE("request_id","email")
);
--> statement-breakpoint
ALTER TABLE "sign_document" ADD CONSTRAINT "sign_document_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_event" ADD CONSTRAINT "sign_event_request_fk" FOREIGN KEY ("request_id","organization_id") REFERENCES "public"."sign_request"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_field" ADD CONSTRAINT "sign_field_signer_fk" FOREIGN KEY ("signer_id","organization_id") REFERENCES "public"."sign_signer"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_field" ADD CONSTRAINT "sign_field_request_fk" FOREIGN KEY ("request_id","organization_id") REFERENCES "public"."sign_request"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_request" ADD CONSTRAINT "sign_request_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_request_document" ADD CONSTRAINT "sign_request_document_request_fk" FOREIGN KEY ("request_id","organization_id") REFERENCES "public"."sign_request"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_request_document" ADD CONSTRAINT "sign_request_document_document_fk" FOREIGN KEY ("document_id","organization_id") REFERENCES "public"."sign_document"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_signer" ADD CONSTRAINT "sign_signer_request_fk" FOREIGN KEY ("request_id","organization_id") REFERENCES "public"."sign_request"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sign_document_environment_created_at_idx" ON "sign_document" USING btree ("environment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sign_document_created_at_idx" ON "sign_document" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sign_fake_object_organization_idx" ON "sign_fake_object" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sign_field_request_idx" ON "sign_field" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "sign_field_signer_idx" ON "sign_field" USING btree ("signer_id");--> statement-breakpoint
CREATE INDEX "sign_request_environment_created_at_idx" ON "sign_request" USING btree ("environment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sign_request_expires_at_idx" ON "sign_request" USING btree ("expires_at") WHERE "sign_request"."status" = 'sent';--> statement-breakpoint
CREATE INDEX "sign_request_created_at_idx" ON "sign_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sign_request_document_document_idx" ON "sign_request_document" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "sign_signer_request_idx" ON "sign_signer" USING btree ("request_id","position");