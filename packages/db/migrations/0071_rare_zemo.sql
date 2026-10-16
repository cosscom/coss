CREATE TYPE "public"."email_stream" AS ENUM('transactional', 'marketing');--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "stream" "email_stream" DEFAULT 'transactional' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_tenant" ADD COLUMN "stream" "email_stream" DEFAULT 'transactional' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_tenant" DROP CONSTRAINT "email_tenant_pkey";--> statement-breakpoint
ALTER TABLE "email_tenant" ADD CONSTRAINT "email_tenant_organization_id_stream_pk" PRIMARY KEY("organization_id","stream");
