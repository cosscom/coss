ALTER TYPE "public"."log_drain_source" ADD VALUE 'sign';--> statement-breakpoint
ALTER TYPE "public"."log_source" ADD VALUE 'sign';--> statement-breakpoint
CREATE TABLE "sign_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"request_id" text NOT NULL,
	"signer_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"api_key_id" text,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_session_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sign_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"allowed_origins" text[] DEFAULT '{}'::text[] NOT NULL,
	"display_name" text,
	"accent_color" text,
	"theme" text DEFAULT 'system' NOT NULL,
	"disclosure" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_settings_environment_unique" UNIQUE("environment_id")
);
--> statement-breakpoint
ALTER TABLE "sign_signer" ADD COLUMN "signature_key" text;--> statement-breakpoint
ALTER TABLE "sign_signer" ADD COLUMN "signature_sha256" text;--> statement-breakpoint
ALTER TABLE "sign_signer" ADD COLUMN "initials_key" text;--> statement-breakpoint
ALTER TABLE "sign_signer" ADD COLUMN "initials_sha256" text;--> statement-breakpoint
ALTER TABLE "sign_session" ADD CONSTRAINT "sign_session_signer_fk" FOREIGN KEY ("signer_id","organization_id") REFERENCES "public"."sign_signer"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_settings" ADD CONSTRAINT "sign_settings_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sign_session_expires_at_idx" ON "sign_session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sign_session_signer_idx" ON "sign_session" USING btree ("signer_id");