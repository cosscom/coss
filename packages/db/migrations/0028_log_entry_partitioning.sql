-- Custom SQL migration file, put your code below! --
-- drizzle-kit can't declare partitioning: 0027 created `log_entry` from the schema (which keeps the
-- snapshot in sync); recreate it, still empty, identically but partitioned by day on `occurred_at`.
-- The worker (`ensureLogPartitions` / `dropExpiredLogPartitions` in @coss/logs) keeps the daily
-- partitions ahead of time and drops expired ones; the default partition catches anything outside
-- them (late events, a worker that stopped).
DROP TABLE "log_entry";--> statement-breakpoint
CREATE TABLE "log_entry" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"source" "log_source" NOT NULL,
	"level" "log_level" NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"request_id" text,
	"api_key_id" text,
	"method" text,
	"path" text,
	"route" text,
	"status_code" integer,
	"duration_ms" integer,
	"client_ip" text,
	"user_agent" text,
	"error_code" text,
	"resource_type" text,
	"resource_id" text,
	"recipient" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	CONSTRAINT "log_entry_pkey" PRIMARY KEY("occurred_at","id")
) PARTITION BY RANGE ("occurred_at");
--> statement-breakpoint
ALTER TABLE "log_entry" ADD CONSTRAINT "log_entry_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "log_entry_environment_occurred_at_idx" ON "log_entry" USING btree ("environment_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "log_entry_environment_request_idx" ON "log_entry" USING btree ("environment_id","request_id") WHERE "log_entry"."request_id" is not null;--> statement-breakpoint
CREATE INDEX "log_entry_environment_resource_idx" ON "log_entry" USING btree ("environment_id","resource_id") WHERE "log_entry"."resource_id" is not null;--> statement-breakpoint
CREATE INDEX "log_entry_search_text_idx" ON "log_entry" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE TABLE "log_entry_default" PARTITION OF "log_entry" DEFAULT;--> statement-breakpoint
DO $$
DECLARE
	day date;
BEGIN
	FOR i IN -1..7 LOOP
		day := (now() AT TIME ZONE 'UTC')::date + i;
		EXECUTE format(
			'CREATE TABLE %I PARTITION OF "log_entry" FOR VALUES FROM (%L) TO (%L)',
			'log_entry_p' || to_char(day, 'YYYYMMDD'),
			day::text || ' 00:00:00+00',
			(day + 1)::text || ' 00:00:00+00'
		);
	END LOOP;
END $$;
