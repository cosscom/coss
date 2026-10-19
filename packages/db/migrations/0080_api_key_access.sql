CREATE TYPE "public"."api_key_access" AS ENUM('full', 'restricted');--> statement-breakpoint
-- Every existing key was created with every permission (and backfilled since): full access. The
-- default only fills existing rows; new bindings always name their access.
ALTER TABLE "environment_api_key" ADD COLUMN "access" "api_key_access" DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "environment_api_key" ALTER COLUMN "access" DROP DEFAULT;
