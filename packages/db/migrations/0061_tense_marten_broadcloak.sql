ALTER TYPE "public"."email_event_type" ADD VALUE 'email.unsubscribed';--> statement-breakpoint
ALTER TYPE "public"."email_suppression_reason" ADD VALUE 'unsubscribe';--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "unsubscribe" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email_tracking_rule" ADD COLUMN "unsubscribe" boolean DEFAULT false NOT NULL;