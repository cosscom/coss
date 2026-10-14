CREATE TYPE "public"."hook_delivery_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."hook_recovery_status" AS ENUM('pending', 'completed');--> statement-breakpoint
CREATE TABLE "hook_application" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"uid" text,
	"name" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hook_application_environment_uid_unique" UNIQUE("environment_id","uid"),
	CONSTRAINT "hook_application_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "hook_attempt" (
	"id" text NOT NULL,
	"message_created_at" timestamp with time zone NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"application_id" text NOT NULL,
	"delivery_id" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"attempted_at" timestamp with time zone NOT NULL,
	"status_code" integer,
	"duration_ms" integer NOT NULL,
	"error" text,
	"response_excerpt" text,
	CONSTRAINT "hook_attempt_pkey" PRIMARY KEY("message_created_at","id")
);
--> statement-breakpoint
CREATE TABLE "hook_delivery" (
	"id" text NOT NULL,
	"message_created_at" timestamp with time zone NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"application_id" text NOT NULL,
	"message_id" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"status" "hook_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"lease_expires_at" timestamp with time zone,
	"last_status_code" integer,
	"last_error" text,
	"finished_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hook_delivery_pkey" PRIMARY KEY("message_created_at","id"),
	CONSTRAINT "hook_delivery_message_endpoint_unique" UNIQUE("message_created_at","message_id","endpoint_id")
);
--> statement-breakpoint
CREATE TABLE "hook_delivery_rollup" (
	"organization_id" text NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"succeeded" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "hook_delivery_rollup_pkey" PRIMARY KEY("organization_id","hour")
);
--> statement-breakpoint
CREATE TABLE "hook_endpoint" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"application_id" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"filter_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"secret_ciphertext" text NOT NULL,
	"previous_secret_ciphertext" text,
	"previous_secret_expires_at" timestamp with time zone,
	"rate_limit_per_second" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"disabled_reason" text,
	"disabled_at" timestamp with time zone,
	"failing_since" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hook_endpoint_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "hook_endpoint_previous_secret_check" CHECK (("hook_endpoint"."previous_secret_ciphertext" is null) = ("hook_endpoint"."previous_secret_expires_at" is null)),
	CONSTRAINT "hook_endpoint_disabled_check" CHECK ("hook_endpoint"."enabled" = ("hook_endpoint"."disabled_reason" is null) and ("hook_endpoint"."disabled_reason" is null) = ("hook_endpoint"."disabled_at" is null)),
	CONSTRAINT "hook_endpoint_rate_limit_check" CHECK ("hook_endpoint"."rate_limit_per_second" is null or "hook_endpoint"."rate_limit_per_second" > 0)
);
--> statement-breakpoint
CREATE TABLE "hook_endpoint_recovery" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"since" timestamp with time zone NOT NULL,
	"until" timestamp with time zone NOT NULL,
	"status" "hook_recovery_status" DEFAULT 'pending' NOT NULL,
	"cursor_created_at" timestamp with time zone,
	"cursor_id" text,
	"requeued" integer DEFAULT 0 NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hook_event_type" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"schema" jsonb,
	"examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hook_event_type_environment_name_unique" UNIQUE("environment_id","name")
);
--> statement-breakpoint
CREATE TABLE "hook_idempotency_key" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"message_id" text NOT NULL,
	"message_created_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hook_idempotency_key_environment_key_unique" UNIQUE("environment_id","key")
);
--> statement-breakpoint
CREATE TABLE "hook_message" (
	"id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"application_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" json NOT NULL,
	"payload_bytes" integer NOT NULL,
	"only_endpoint_id" text,
	CONSTRAINT "hook_message_pkey" PRIMARY KEY("created_at","id")
);
--> statement-breakpoint
CREATE TABLE "hook_portal_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"application_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"read_only" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"api_key_id" text,
	"created_by_user_id" text,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hook_portal_session_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "hook_portal_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"allowed_origins" text[] DEFAULT '{}'::text[] NOT NULL,
	"display_name" text,
	"accent_color" text,
	"theme" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hook_portal_settings_environment_unique" UNIQUE("environment_id")
);
--> statement-breakpoint
ALTER TABLE "webhook_endpoint" ADD COLUMN "disabled_reason" text;--> statement-breakpoint
ALTER TABLE "webhook_endpoint" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "webhook_endpoint" ADD COLUMN "failing_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hook_application" ADD CONSTRAINT "hook_application_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hook_delivery_rollup" ADD CONSTRAINT "hook_delivery_rollup_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hook_endpoint" ADD CONSTRAINT "hook_endpoint_application_fk" FOREIGN KEY ("application_id","organization_id") REFERENCES "public"."hook_application"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hook_endpoint_recovery" ADD CONSTRAINT "hook_endpoint_recovery_endpoint_fk" FOREIGN KEY ("endpoint_id","organization_id") REFERENCES "public"."hook_endpoint"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hook_event_type" ADD CONSTRAINT "hook_event_type_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hook_idempotency_key" ADD CONSTRAINT "hook_idempotency_key_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hook_portal_session" ADD CONSTRAINT "hook_portal_session_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hook_portal_session" ADD CONSTRAINT "hook_portal_session_application_fk" FOREIGN KEY ("application_id","organization_id") REFERENCES "public"."hook_application"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hook_portal_settings" ADD CONSTRAINT "hook_portal_settings_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hook_application_environment_created_at_idx" ON "hook_application" USING btree ("environment_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hook_attempt_delivery_idx" ON "hook_attempt" USING btree ("delivery_id","attempted_at");--> statement-breakpoint
CREATE INDEX "hook_attempt_environment_idx" ON "hook_attempt" USING btree ("environment_id","message_created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hook_delivery_due_idx" ON "hook_delivery" USING btree ("next_attempt_at") WHERE "hook_delivery"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "hook_delivery_endpoint_idx" ON "hook_delivery" USING btree ("endpoint_id","message_created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hook_delivery_environment_idx" ON "hook_delivery" USING btree ("environment_id","message_created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hook_delivery_rollup_hour_idx" ON "hook_delivery_rollup" USING btree ("hour");--> statement-breakpoint
CREATE INDEX "hook_endpoint_application_idx" ON "hook_endpoint" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "hook_endpoint_recovery_pending_idx" ON "hook_endpoint_recovery" USING btree ("created_at") WHERE "hook_endpoint_recovery"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "hook_endpoint_recovery_endpoint_idx" ON "hook_endpoint_recovery" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "hook_idempotency_key_created_at_idx" ON "hook_idempotency_key" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "hook_message_application_created_at_idx" ON "hook_message" USING btree ("application_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hook_message_environment_created_at_idx" ON "hook_message" USING btree ("environment_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hook_portal_session_expires_at_idx" ON "hook_portal_session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "hook_portal_session_organization_idx" ON "hook_portal_session" USING btree ("organization_id");--> statement-breakpoint
-- Endpoints switched off before these columns existed were switched off by hand.
UPDATE "webhook_endpoint" SET "disabled_reason" = 'manual', "disabled_at" = "updated_at" WHERE NOT "enabled";