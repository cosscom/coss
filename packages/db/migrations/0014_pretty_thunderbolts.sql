ALTER TYPE "public"."email_event_type" ADD VALUE 'email.scheduled' BEFORE 'email.opened';--> statement-breakpoint
ALTER TYPE "public"."email_event_type" ADD VALUE 'email.canceled' BEFORE 'email.opened';--> statement-breakpoint
ALTER TYPE "public"."email_recipient_status" ADD VALUE 'canceled';--> statement-breakpoint
ALTER TYPE "public"."email_status" ADD VALUE 'scheduled';--> statement-breakpoint
ALTER TYPE "public"."email_status" ADD VALUE 'canceled';--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "email_scheduled_at_idx" ON "email" USING btree ("scheduled_at") WHERE "email"."scheduled_at" is not null;