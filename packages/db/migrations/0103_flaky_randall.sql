CREATE TYPE "public"."log_drain_format" AS ENUM('ndjson', 'loki', 'datadog', 'otlp');--> statement-breakpoint
ALTER TABLE "log_drain" ADD COLUMN "format" "log_drain_format" DEFAULT 'ndjson' NOT NULL;--> statement-breakpoint
ALTER TABLE "log_drain" ADD COLUMN "auth_header_name" text;--> statement-breakpoint
ALTER TABLE "log_drain" ADD COLUMN "auth_header_ciphertext" text;--> statement-breakpoint
ALTER TABLE "log_drain" ADD CONSTRAINT "log_drain_auth_header_check" CHECK (("log_drain"."auth_header_name" is null) = ("log_drain"."auth_header_ciphertext" is null));