CREATE TYPE "public"."log_drain_batch_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."log_drain_source" AS ENUM('api', 'email', 'webhook', 'audit');--> statement-breakpoint
CREATE TABLE "log_drain" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"sources" "log_drain_source"[] DEFAULT '{}'::log_drain_source[] NOT NULL,
	"secret_ciphertext" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"disabled_reason" text,
	"disabled_at" timestamp with time zone,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "log_drain_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "log_drain_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"attempted_at" timestamp with time zone NOT NULL,
	"status_code" integer,
	"duration_ms" integer NOT NULL,
	"error" text,
	"response_excerpt" text
);
--> statement-breakpoint
CREATE TABLE "log_drain_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"drain_id" text NOT NULL,
	"status" "log_drain_batch_status" DEFAULT 'pending' NOT NULL,
	"record_count" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"lease_expires_at" timestamp with time zone,
	"last_status_code" integer,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "log_drain_batch_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "log_drain_record" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"drain_id" text NOT NULL,
	"batch_id" text,
	"source" "log_drain_source" NOT NULL,
	"source_id" text NOT NULL,
	"line" json NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "log_drain_record_drain_source_unique" UNIQUE("drain_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "log_drain" ADD CONSTRAINT "log_drain_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_drain" ADD CONSTRAINT "log_drain_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_drain_attempt" ADD CONSTRAINT "log_drain_attempt_batch_fk" FOREIGN KEY ("batch_id","organization_id") REFERENCES "public"."log_drain_batch"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_drain_batch" ADD CONSTRAINT "log_drain_batch_drain_fk" FOREIGN KEY ("drain_id","organization_id") REFERENCES "public"."log_drain"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_drain_record" ADD CONSTRAINT "log_drain_record_drain_fk" FOREIGN KEY ("drain_id","organization_id") REFERENCES "public"."log_drain"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_drain_record" ADD CONSTRAINT "log_drain_record_batch_fk" FOREIGN KEY ("batch_id","organization_id") REFERENCES "public"."log_drain_batch"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "log_drain_environment_idx" ON "log_drain" USING btree ("environment_id") WHERE "log_drain"."enabled";--> statement-breakpoint
CREATE INDEX "log_drain_attempt_batch_idx" ON "log_drain_attempt" USING btree ("batch_id","attempted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "log_drain_batch_pending_unique" ON "log_drain_batch" USING btree ("drain_id") WHERE "log_drain_batch"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "log_drain_batch_due_idx" ON "log_drain_batch" USING btree ("next_attempt_at") WHERE "log_drain_batch"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "log_drain_batch_drain_created_at_idx" ON "log_drain_batch" USING btree ("drain_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "log_drain_batch_updated_at_idx" ON "log_drain_batch" USING btree ("updated_at") WHERE "log_drain_batch"."status" <> 'pending';--> statement-breakpoint
CREATE INDEX "log_drain_record_queued_idx" ON "log_drain_record" USING btree ("drain_id","id") WHERE "log_drain_record"."batch_id" is null;--> statement-breakpoint
CREATE INDEX "log_drain_record_batch_idx" ON "log_drain_record" USING btree ("batch_id");