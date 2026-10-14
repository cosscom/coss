ALTER TABLE "webhook_endpoint" ADD COLUMN "disabled_reason" text;--> statement-breakpoint
ALTER TABLE "webhook_endpoint" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "webhook_endpoint" ADD COLUMN "failing_since" timestamp with time zone;--> statement-breakpoint
-- Endpoints switched off before these columns existed were switched off by hand.
UPDATE "webhook_endpoint" SET "disabled_reason" = 'manual', "disabled_at" = "updated_at" WHERE NOT "enabled";--> statement-breakpoint
ALTER TABLE "webhook_endpoint" ADD CONSTRAINT "webhook_endpoint_disabled_check" CHECK ("webhook_endpoint"."enabled" = ("webhook_endpoint"."disabled_reason" is null) and ("webhook_endpoint"."disabled_reason" is null) = ("webhook_endpoint"."disabled_at" is null));