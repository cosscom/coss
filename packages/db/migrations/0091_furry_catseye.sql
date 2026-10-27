ALTER TABLE "sign_request" ADD COLUMN "reminder_interval_days" integer;--> statement-breakpoint
ALTER TABLE "sign_request" ADD COLUMN "expired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sign_settings" ADD COLUMN "email_from" text;--> statement-breakpoint
ALTER TABLE "sign_settings" ADD COLUMN "reminder_interval_days" integer;--> statement-breakpoint
ALTER TABLE "sign_signer" ADD COLUMN "notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sign_signer" ADD COLUMN "reminder_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sign_signer" ADD COLUMN "last_reminded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sign_signer" ADD COLUMN "next_reminder_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sign_signer" ADD COLUMN "remind_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sign_signer" ADD COLUMN "copy_sent_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "sign_signer_email_due_idx" ON "sign_signer" USING btree ("request_id") WHERE "sign_signer"."delivery" = 'email' and ("sign_signer"."notified_at" is null or "sign_signer"."next_reminder_at" is not null or "sign_signer"."remind_requested_at" is not null or ("sign_signer"."status" = 'signed' and "sign_signer"."copy_sent_at" is null));