CREATE TYPE "public"."api_key_access" AS ENUM('full', 'restricted');--> statement-breakpoint
ALTER TABLE "environment_api_key" ADD COLUMN "access" "api_key_access" DEFAULT 'full' NOT NULL;