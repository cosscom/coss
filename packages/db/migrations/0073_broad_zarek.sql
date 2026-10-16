ALTER TYPE "public"."reputation_event_type" ADD VALUE 'marketing_paused';--> statement-breakpoint
ALTER TYPE "public"."reputation_event_type" ADD VALUE 'marketing_reinstated';--> statement-breakpoint
ALTER TABLE "email_reputation_rollup" ADD COLUMN "stream" "email_stream" DEFAULT 'transactional' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_reputation_rollup" DROP CONSTRAINT "email_reputation_rollup_organization_id_bucket_start_pk";--> statement-breakpoint
ALTER TABLE "email_reputation_rollup" ADD CONSTRAINT "email_reputation_rollup_organization_id_bucket_start_stream_pk" PRIMARY KEY("organization_id","bucket_start","stream");--> statement-breakpoint
ALTER TABLE "reputation_standing" ADD COLUMN "marketing_paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reputation_standing" ADD COLUMN "marketing_reason" text;--> statement-breakpoint
ALTER TABLE "reputation_standing" ADD COLUMN "marketing_reinstated_at" timestamp with time zone;
