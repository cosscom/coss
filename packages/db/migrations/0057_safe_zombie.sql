ALTER TYPE "public"."risk_identity_kind" ADD VALUE 'device';--> statement-breakpoint
ALTER TYPE "public"."risk_report_kind" ADD VALUE 'card';--> statement-breakpoint
ALTER TYPE "public"."risk_report_kind" ADD VALUE 'device';--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "card_hash" text;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "device_hash" text;--> statement-breakpoint
ALTER TABLE "risk_settings" ADD COLUMN "reason_weights" jsonb DEFAULT '{}'::jsonb NOT NULL;