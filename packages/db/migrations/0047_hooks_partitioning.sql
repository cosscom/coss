-- Custom SQL migration file, put your code below! --
-- drizzle-kit can't declare partitioning: 0046 created the Hooks message, delivery and attempt
-- tables from the schema (which keeps the snapshot in sync); recreate them, still empty, identically
-- but partitioned by UTC day of the message's creation. There is no default partition: expired days
-- are detached concurrently (Postgres refuses that while a default partition exists) and dropped by
-- the worker (`@coss/db/partitions`), which also keeps a week of days ahead.
DROP TABLE "hook_message";--> statement-breakpoint
DROP TABLE "hook_delivery";--> statement-breakpoint
DROP TABLE "hook_attempt";--> statement-breakpoint
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
) PARTITION BY RANGE ("created_at");--> statement-breakpoint
CREATE INDEX "hook_message_application_created_at_idx" ON "hook_message" USING btree ("application_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hook_message_environment_created_at_idx" ON "hook_message" USING btree ("environment_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
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
) PARTITION BY RANGE ("message_created_at");--> statement-breakpoint
CREATE INDEX "hook_delivery_due_idx" ON "hook_delivery" USING btree ("next_attempt_at") WHERE "hook_delivery"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "hook_delivery_endpoint_idx" ON "hook_delivery" USING btree ("endpoint_id","message_created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hook_delivery_environment_idx" ON "hook_delivery" USING btree ("environment_id","message_created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
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
) PARTITION BY RANGE ("message_created_at");--> statement-breakpoint
CREATE INDEX "hook_attempt_delivery_idx" ON "hook_attempt" USING btree ("delivery_id","attempted_at");--> statement-breakpoint
CREATE INDEX "hook_attempt_environment_idx" ON "hook_attempt" USING btree ("environment_id","message_created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
DO $$
DECLARE
	day date;
	parent text;
BEGIN
	FOREACH parent IN ARRAY ARRAY['hook_message', 'hook_delivery', 'hook_attempt'] LOOP
		FOR i IN -1..7 LOOP
			day := (now() AT TIME ZONE 'UTC')::date + i;
			EXECUTE format(
				'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
				parent || '_p' || to_char(day, 'YYYYMMDD'),
				parent,
				day::text || ' 00:00:00+00',
				(day + 1)::text || ' 00:00:00+00'
			);
		END LOOP;
	END LOOP;
END $$;
