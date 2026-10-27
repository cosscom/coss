ALTER TYPE "public"."sign_event_type" ADD VALUE 'sealed';--> statement-breakpoint
ALTER TABLE "sign_request" ADD COLUMN "signed_document_key" text;--> statement-breakpoint
ALTER TABLE "sign_request" ADD COLUMN "signed_document_sha256" text;--> statement-breakpoint
ALTER TABLE "sign_request" ADD COLUMN "sealed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sign_request" ADD COLUMN "seal_lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sign_request" ADD COLUMN "seal_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sign_request" ADD COLUMN "seal_next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sign_request" ADD COLUMN "seal_error" text;--> statement-breakpoint
CREATE INDEX "sign_request_unsealed_idx" ON "sign_request" USING btree ("completed_at") WHERE "sign_request"."status" = 'completed' and "sign_request"."sealed_at" is null;