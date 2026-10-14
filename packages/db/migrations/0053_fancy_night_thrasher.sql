CREATE TYPE "public"."risk_captcha_provider" AS ENUM('turnstile', 'hcaptcha');--> statement-breakpoint
CREATE TYPE "public"."risk_rule_match" AS ENUM('all', 'any');--> statement-breakpoint
CREATE TYPE "public"."risk_user_network_kind" AS ENUM('country', 'asn');--> statement-breakpoint
CREATE TABLE "risk_domain_age" (
	"domain" text PRIMARY KEY NOT NULL,
	"registered_at" timestamp with time zone,
	"status" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"events" text[] DEFAULT '{}'::text[] NOT NULL,
	"match" "risk_rule_match" DEFAULT 'all' NOT NULL,
	"conditions" jsonb NOT NULL,
	"action" "risk_decision" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_settings" (
	"environment_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"review_threshold" real NOT NULL,
	"block_threshold" real NOT NULL,
	"disabled_reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"captcha_provider" "risk_captcha_provider",
	"captcha_secret_ciphertext" text,
	"captcha_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_settings_thresholds_check" CHECK ("risk_settings"."review_threshold" > 0 and "risk_settings"."review_threshold" <= "risk_settings"."block_threshold" and "risk_settings"."block_threshold" <= 1),
	CONSTRAINT "risk_settings_captcha_check" CHECK (("risk_settings"."captcha_provider" is null) = ("risk_settings"."captcha_secret_ciphertext" is null))
);
--> statement-breakpoint
CREATE TABLE "risk_user_network" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"user_hash" text NOT NULL,
	"kind" "risk_user_network_kind" NOT NULL,
	"value" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_user_network_value_unique" UNIQUE("environment_id","user_hash","kind","value")
);
--> statement-breakpoint
ALTER TABLE "risk_rule" ADD CONSTRAINT "risk_rule_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_settings" ADD CONSTRAINT "risk_settings_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_user_network" ADD CONSTRAINT "risk_user_network_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "risk_rule_environment_position_idx" ON "risk_rule" USING btree ("environment_id","position","created_at");--> statement-breakpoint
CREATE INDEX "risk_user_network_last_seen_idx" ON "risk_user_network" USING btree ("last_seen_at");