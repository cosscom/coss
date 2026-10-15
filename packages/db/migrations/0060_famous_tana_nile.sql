CREATE TYPE "public"."apns_environment" AS ENUM('production', 'sandbox');--> statement-breakpoint
CREATE TYPE "public"."push_notification_kind" AS ENUM('reputation_warning', 'reputation_suspended', 'billing_payment_failed', 'billing_hold_placed', 'webhook_endpoint_disabled', 'hook_endpoint_disabled', 'log_drain_disabled', 'risk_review');--> statement-breakpoint
CREATE TYPE "public"."push_notification_status" AS ENUM('pending', 'sent', 'skipped', 'failed');--> statement-breakpoint
CREATE TABLE "push_device" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"token" text NOT NULL,
	"apns_environment" "apns_environment" NOT NULL,
	"categories" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text,
	"kind" "push_notification_kind" NOT NULL,
	"subject_id" text NOT NULL,
	"collapse_key" text,
	"count" integer DEFAULT 1 NOT NULL,
	"status" "push_notification_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"delivered_device_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_device" ADD CONSTRAINT "push_device_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_device" ADD CONSTRAINT "push_device_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notification" ADD CONSTRAINT "push_notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notification" ADD CONSTRAINT "push_notification_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_device_session_idx" ON "push_device" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_device_token_idx" ON "push_device" USING btree ("token");--> statement-breakpoint
CREATE INDEX "push_device_user_idx" ON "push_device" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_notification_pending_collapse_idx" ON "push_notification" USING btree ("collapse_key") WHERE "push_notification"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "push_notification_collapse_sent_idx" ON "push_notification" USING btree ("collapse_key","sent_at") WHERE "push_notification"."collapse_key" IS NOT NULL AND "push_notification"."sent_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "push_notification_next_attempt_idx" ON "push_notification" USING btree ("next_attempt_at") WHERE "push_notification"."next_attempt_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "push_notification_created_at_idx" ON "push_notification" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "push_notification_organization_idx" ON "push_notification" USING btree ("organization_id");