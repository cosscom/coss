CREATE TYPE "public"."dedicated_ip_pool_status" AS ENUM('waiting', 'provisioning', 'warming', 'ready', 'releasing');--> statement-breakpoint
CREATE TABLE "dedicated_ip_delivery_rollup" (
	"organization_id" text NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"sending_ip" text NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "dedicated_ip_delivery_rollup_organization_id_hour_sending_ip_pk" PRIMARY KEY("organization_id","hour","sending_ip")
);
--> statement-breakpoint
CREATE TABLE "dedicated_ip_pool" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"status" "dedicated_ip_pool_status" NOT NULL,
	"ips" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dedicated_share" real,
	"status_message" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_check_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"provisioned_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"release_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dedicated_ip_pool_organization_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "dedicated_pool" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dedicated_ip_delivery_rollup" ADD CONSTRAINT "dedicated_ip_delivery_rollup_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedicated_ip_pool" ADD CONSTRAINT "dedicated_ip_pool_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dedicated_ip_delivery_rollup_hour_idx" ON "dedicated_ip_delivery_rollup" USING btree ("hour");--> statement-breakpoint
CREATE INDEX "dedicated_ip_pool_next_check_at_idx" ON "dedicated_ip_pool" USING btree ("next_check_at") WHERE "dedicated_ip_pool"."next_check_at" is not null;