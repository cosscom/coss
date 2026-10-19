CREATE TYPE "public"."billing_budget_scope" AS ENUM('member_default', 'user', 'project', 'api_key');--> statement-breakpoint
ALTER TYPE "public"."push_notification_kind" ADD VALUE 'billing_budget_paused' BEFORE 'webhook_endpoint_disabled';--> statement-breakpoint
CREATE TABLE "billing_budget" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"scope" "billing_budget_scope" NOT NULL,
	"user_id" text,
	"project_id" text,
	"api_key_id" text,
	"amount_cents" bigint,
	"alert_thresholds" integer[] DEFAULT '{80,100}'::integer[] NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_budget_target_check" CHECK (case "billing_budget"."scope"
        when 'member_default' then "billing_budget"."user_id" is null and "billing_budget"."project_id" is null and "billing_budget"."api_key_id" is null and "billing_budget"."amount_cents" is not null
        when 'user' then "billing_budget"."user_id" is not null and "billing_budget"."project_id" is null and "billing_budget"."api_key_id" is null
        when 'project' then "billing_budget"."user_id" is null and "billing_budget"."project_id" is not null and "billing_budget"."api_key_id" is null and "billing_budget"."amount_cents" is not null
        when 'api_key' then "billing_budget"."user_id" is null and "billing_budget"."project_id" is null and "billing_budget"."api_key_id" is not null and "billing_budget"."amount_cents" is not null
      end),
	CONSTRAINT "billing_budget_amount_check" CHECK ("billing_budget"."amount_cents" is null or "billing_budget"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing_budget_hold" (
	"organization_id" text NOT NULL,
	"scope" "billing_budget_scope" NOT NULL,
	"target_id" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"spent_cents" bigint NOT NULL,
	"limit_cents" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_budget_hold_organization_id_scope_target_id_pk" PRIMARY KEY("organization_id","scope","target_id")
);
--> statement-breakpoint
CREATE TABLE "billing_usage_attribution" (
	"organization_id" text NOT NULL,
	"hour_start" timestamp with time zone NOT NULL,
	"meter" text NOT NULL,
	"dimension" text DEFAULT '' NOT NULL,
	"environment_id" text NOT NULL,
	"project_id" text DEFAULT '' NOT NULL,
	"api_key_id" text DEFAULT '' NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"shard" smallint DEFAULT 0 NOT NULL,
	"quantity" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "billing_usage_attribution_pk" PRIMARY KEY("organization_id","hour_start","meter","dimension","environment_id","api_key_id","user_id","shard")
);
--> statement-breakpoint
ALTER TABLE "billing_notification" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "broadcast" ADD COLUMN "api_key_owner_id" text;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "api_key_owner_id" text;--> statement-breakpoint
ALTER TABLE "environment" ADD COLUMN "personal_keys" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "environment_api_key" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "sms_message" ADD COLUMN "api_key_owner_id" text;--> statement-breakpoint
ALTER TABLE "billing_budget" ADD CONSTRAINT "billing_budget_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_budget" ADD CONSTRAINT "billing_budget_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_budget" ADD CONSTRAINT "billing_budget_api_key_id_apikey_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."apikey"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_budget" ADD CONSTRAINT "billing_budget_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_budget" ADD CONSTRAINT "billing_budget_project_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "public"."project"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_budget_hold" ADD CONSTRAINT "billing_budget_hold_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_usage_attribution" ADD CONSTRAINT "billing_usage_attribution_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_budget_member_default_idx" ON "billing_budget" USING btree ("organization_id") WHERE "billing_budget"."scope" = 'member_default';--> statement-breakpoint
CREATE UNIQUE INDEX "billing_budget_user_idx" ON "billing_budget" USING btree ("organization_id","user_id") WHERE "billing_budget"."scope" = 'user';--> statement-breakpoint
CREATE UNIQUE INDEX "billing_budget_project_idx" ON "billing_budget" USING btree ("organization_id","project_id") WHERE "billing_budget"."scope" = 'project';--> statement-breakpoint
CREATE UNIQUE INDEX "billing_budget_api_key_idx" ON "billing_budget" USING btree ("organization_id","api_key_id") WHERE "billing_budget"."scope" = 'api_key';--> statement-breakpoint
CREATE INDEX "billing_usage_attribution_hour_idx" ON "billing_usage_attribution" USING btree ("hour_start");--> statement-breakpoint
ALTER TABLE "billing_notification" ADD CONSTRAINT "billing_notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_api_key" ADD CONSTRAINT "environment_api_key_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "environment_api_key_owner_idx" ON "environment_api_key" USING btree ("owner_user_id");