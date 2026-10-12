CREATE TYPE "public"."billing_account_status" AS ENUM('active', 'past_due', 'delinquent');--> statement-breakpoint
CREATE TYPE "public"."billing_collection_method" AS ENUM('charge_automatically', 'send_invoice');--> statement-breakpoint
CREATE TYPE "public"."billing_contract_kind" AS ENUM('self_serve', 'sales', 'internal');--> statement-breakpoint
CREATE TYPE "public"."billing_contract_status" AS ENUM('pending', 'confirmed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."billing_credit_entry_kind" AS ENUM('applied', 'reversed', 'voided', 'rolled_over');--> statement-breakpoint
CREATE TYPE "public"."billing_credit_note_status" AS ENUM('pending', 'issued', 'failed');--> statement-breakpoint
CREATE TYPE "public"."billing_grant_applies_to" AS ENUM('usage', 'any');--> statement-breakpoint
CREATE TYPE "public"."billing_grant_kind" AS ENUM('amount', 'units');--> statement-breakpoint
CREATE TYPE "public"."billing_grant_source" AS ENUM('fee', 'commitment', 'support', 'promotion', 'refund', 'sla');--> statement-breakpoint
CREATE TYPE "public"."billing_hold_reason" AS ENUM('delinquent', 'spend_limit', 'admin');--> statement-breakpoint
CREATE TYPE "public"."billing_invoice_kind" AS ENUM('period', 'plan_change', 'one_off', 'final');--> statement-breakpoint
CREATE TYPE "public"."billing_invoice_status" AS ENUM('draft', 'open', 'paid', 'void', 'uncollectible');--> statement-breakpoint
CREATE TYPE "public"."billing_line_kind" AS ENUM('plan_fee', 'proration', 'usage', 'credit', 'discount', 'commitment_fee', 'commitment_shortfall', 'add_on', 'adjustment', 'write_off');--> statement-breakpoint
CREATE TYPE "public"."billing_notification_status" AS ENUM('pending', 'sent', 'skipped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."billing_provider" AS ENUM('fake', 'stripe', 'manual');--> statement-breakpoint
CREATE TYPE "public"."billing_provider_event_status" AS ENUM('pending', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."billing_sync_action" AS ENUM('push', 'collect', 'void', 'mark_uncollectible');--> statement-breakpoint
CREATE TYPE "public"."billing_tax_mode" AS ENUM('none', 'stripe_automatic');--> statement-breakpoint
CREATE TABLE "billing_account" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_customer_id" text,
	"collection_method" "billing_collection_method" DEFAULT 'charge_automatically' NOT NULL,
	"net_terms_days" integer DEFAULT 30 NOT NULL,
	"allowed_payment_methods" text[] DEFAULT '{card}'::text[] NOT NULL,
	"required_payment_methods" text[] DEFAULT '{}'::text[] NOT NULL,
	"tax_mode" "billing_tax_mode" DEFAULT 'none' NOT NULL,
	"billing_email" text,
	"billing_cc" text[] DEFAULT '{}'::text[] NOT NULL,
	"billing_name" text,
	"billing_address" jsonb,
	"tax_id" text,
	"spend_limit_cents" bigint,
	"alert_thresholds" integer[] DEFAULT '{80,100}'::integer[] NOT NULL,
	"grace_days" integer DEFAULT 14 NOT NULL,
	"status" "billing_account_status" DEFAULT 'active' NOT NULL,
	"past_due_since" timestamp with time zone,
	"hold_exempt_until" timestamp with time zone,
	"payment_method" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_account_organization_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "billing_contract" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"account_id" text NOT NULL,
	"kind" "billing_contract_kind" NOT NULL,
	"status" "billing_contract_status" NOT NULL,
	"plan" text NOT NULL,
	"terms" jsonb NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"term_end" timestamp with time zone,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"supersedes_id" text,
	"pending_invoice_id" text,
	"pending_expires_at" timestamp with time zone,
	"created_by_user_id" text,
	"note" text,
	"reference" text,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_counter" (
	"name" text PRIMARY KEY NOT NULL,
	"value" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_credit_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"grant_id" text NOT NULL,
	"invoice_id" text,
	"kind" "billing_credit_entry_kind" NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_credit_grant" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"kind" "billing_grant_kind" NOT NULL,
	"amount" bigint NOT NULL,
	"meter" text,
	"dimension" text,
	"scope" text[],
	"applies_to" "billing_grant_applies_to" DEFAULT 'usage' NOT NULL,
	"source" "billing_grant_source" NOT NULL,
	"grant_key" text,
	"contract_id" text,
	"invoice_id" text,
	"description" text NOT NULL,
	"reason" text,
	"effective_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by_user_id" text,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_credit_grant_key_unique" UNIQUE("grant_key")
);
--> statement-breakpoint
CREATE TABLE "billing_credit_note" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"number" text,
	"amount_cents" bigint NOT NULL,
	"refund_cents" bigint DEFAULT 0 NOT NULL,
	"memo" text NOT NULL,
	"reason" text,
	"status" "billing_credit_note_status" DEFAULT 'pending' NOT NULL,
	"provider_credit_note_id" text,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"next_sync_at" timestamp with time zone,
	"sync_error" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_credit_note_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "billing_hold" (
	"organization_id" text NOT NULL,
	"reason" "billing_hold_reason" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_hold_organization_id_reason_pk" PRIMARY KEY("organization_id","reason")
);
--> statement-breakpoint
CREATE TABLE "billing_invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"account_id" text NOT NULL,
	"organization_name" text NOT NULL,
	"organization_slug" text NOT NULL,
	"number" text,
	"kind" "billing_invoice_kind" NOT NULL,
	"status" "billing_invoice_status" DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"subtotal_cents" bigint DEFAULT 0 NOT NULL,
	"discount_cents" bigint DEFAULT 0 NOT NULL,
	"credit_cents" bigint DEFAULT 0 NOT NULL,
	"tax_cents" bigint DEFAULT 0 NOT NULL,
	"total_cents" bigint DEFAULT 0 NOT NULL,
	"amount_paid_cents" bigint DEFAULT 0 NOT NULL,
	"amount_due_cents" bigint DEFAULT 0 NOT NULL,
	"collection_method" "billing_collection_method" NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_customer_id" text,
	"provider_invoice_id" text,
	"hosted_url" text,
	"pdf_url" text,
	"billing_email" text,
	"due_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"sync_action" "billing_sync_action",
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"next_sync_at" timestamp with time zone,
	"sync_error" text,
	"collection_attempts" integer DEFAULT 0 NOT NULL,
	"next_collection_at" timestamp with time zone,
	"payment_state" text,
	"payment_error" text,
	"terms_snapshot" jsonb,
	"memo" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoice_number_unique" UNIQUE("number"),
	CONSTRAINT "billing_invoice_provider_unique" UNIQUE("provider_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "billing_invoice_line" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"position" integer NOT NULL,
	"kind" "billing_line_kind" NOT NULL,
	"description" text NOT NULL,
	"meter" text,
	"dimension" text,
	"quantity" bigint,
	"covered_units" bigint,
	"unit_nanos" bigint,
	"amount_cents" bigint NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"contract_id" text,
	"grant_id" text,
	"charge_key" text,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "billing_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "billing_notification_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"recipients" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_notification_dedupe_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "billing_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"provider_payment_id" text,
	"received_at" timestamp with time zone NOT NULL,
	"recorded_by_user_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_payment_provider_unique" UNIQUE("provider_payment_id")
);
--> statement-breakpoint
CREATE TABLE "billing_period" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"account_id" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"invoice_id" text,
	"usage" jsonb NOT NULL,
	"warnings" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_provider_event" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "billing_provider_event_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_quota" (
	"organization_id" text NOT NULL,
	"meter" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"reserved" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_quota_organization_id_meter_period_start_pk" PRIMARY KEY("organization_id","meter","period_start")
);
--> statement-breakpoint
CREATE TABLE "billing_usage" (
	"organization_id" text NOT NULL,
	"hour_start" timestamp with time zone NOT NULL,
	"meter" text NOT NULL,
	"dimension" text DEFAULT '' NOT NULL,
	"environment_id" text NOT NULL,
	"shard" smallint DEFAULT 0 NOT NULL,
	"quantity" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "billing_usage_organization_id_hour_start_meter_dimension_environment_id_shard_pk" PRIMARY KEY("organization_id","hour_start","meter","dimension","environment_id","shard")
);
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "billable_recipients" integer;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "usage_recorded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_account" ADD CONSTRAINT "billing_account_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_contract" ADD CONSTRAINT "billing_contract_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_contract" ADD CONSTRAINT "billing_contract_account_id_billing_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."billing_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_contract" ADD CONSTRAINT "billing_contract_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_entry" ADD CONSTRAINT "billing_credit_entry_grant_id_billing_credit_grant_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."billing_credit_grant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_grant" ADD CONSTRAINT "billing_credit_grant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_grant" ADD CONSTRAINT "billing_credit_grant_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_note" ADD CONSTRAINT "billing_credit_note_invoice_id_billing_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."billing_invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_hold" ADD CONSTRAINT "billing_hold_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoice_line" ADD CONSTRAINT "billing_invoice_line_invoice_id_billing_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."billing_invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_notification" ADD CONSTRAINT "billing_notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payment" ADD CONSTRAINT "billing_payment_invoice_id_billing_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."billing_invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_period" ADD CONSTRAINT "billing_period_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_period" ADD CONSTRAINT "billing_period_account_id_billing_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."billing_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_quota" ADD CONSTRAINT "billing_quota_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_usage" ADD CONSTRAINT "billing_usage_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_contract_organization_idx" ON "billing_contract" USING btree ("organization_id","effective_from");--> statement-breakpoint
CREATE INDEX "billing_contract_pending_idx" ON "billing_contract" USING btree ("pending_expires_at") WHERE "billing_contract"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "billing_credit_entry_grant_idx" ON "billing_credit_entry" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "billing_credit_grant_organization_idx" ON "billing_credit_grant" USING btree ("organization_id","effective_at");--> statement-breakpoint
CREATE INDEX "billing_credit_grant_invoice_idx" ON "billing_credit_grant" USING btree ("invoice_id") WHERE "billing_credit_grant"."invoice_id" is not null;--> statement-breakpoint
CREATE INDEX "billing_credit_note_invoice_idx" ON "billing_credit_note" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "billing_credit_note_sync_idx" ON "billing_credit_note" USING btree ("next_sync_at") WHERE "billing_credit_note"."next_sync_at" is not null;--> statement-breakpoint
CREATE INDEX "billing_invoice_organization_idx" ON "billing_invoice" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "billing_invoice_period_idx" ON "billing_invoice" USING btree ("account_id","period_start") WHERE "billing_invoice"."kind" = 'period' and "billing_invoice"."status" <> 'void';--> statement-breakpoint
CREATE UNIQUE INDEX "billing_invoice_final_idx" ON "billing_invoice" USING btree ("account_id") WHERE "billing_invoice"."kind" = 'final' and "billing_invoice"."status" <> 'void';--> statement-breakpoint
CREATE INDEX "billing_invoice_sync_idx" ON "billing_invoice" USING btree ("next_sync_at") WHERE "billing_invoice"."next_sync_at" is not null;--> statement-breakpoint
CREATE INDEX "billing_invoice_collection_idx" ON "billing_invoice" USING btree ("next_collection_at") WHERE "billing_invoice"."next_collection_at" is not null;--> statement-breakpoint
CREATE INDEX "billing_invoice_created_at_idx" ON "billing_invoice" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "billing_invoice_line_invoice_idx" ON "billing_invoice_line" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_invoice_line_charge_key_idx" ON "billing_invoice_line" USING btree ("charge_key") WHERE "billing_invoice_line"."charge_key" is not null;--> statement-breakpoint
CREATE INDEX "billing_invoice_line_contract_idx" ON "billing_invoice_line" USING btree ("contract_id","period_start") WHERE "billing_invoice_line"."contract_id" is not null;--> statement-breakpoint
CREATE INDEX "billing_notification_next_attempt_idx" ON "billing_notification" USING btree ("next_attempt_at") WHERE "billing_notification"."next_attempt_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "billing_notification_created_at_idx" ON "billing_notification" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "billing_payment_invoice_idx" ON "billing_payment" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_period_account_start_idx" ON "billing_period" USING btree ("account_id","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_provider_event_unique_idx" ON "billing_provider_event" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "billing_provider_event_next_attempt_idx" ON "billing_provider_event" USING btree ("next_attempt_at") WHERE "billing_provider_event"."next_attempt_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "billing_provider_event_created_at_idx" ON "billing_provider_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "billing_usage_hour_idx" ON "billing_usage" USING btree ("hour_start");