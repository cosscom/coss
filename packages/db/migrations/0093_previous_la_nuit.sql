CREATE TABLE "sign_store_cleanup" (
	"key" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sign_store_cleanup_next_attempt_at_idx" ON "sign_store_cleanup" USING btree ("next_attempt_at");--> statement-breakpoint
CREATE INDEX "sign_store_cleanup_organization_idx" ON "sign_store_cleanup" USING btree ("organization_id");