CREATE TABLE "email_metric" (
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"hour_start" timestamp with time zone NOT NULL,
	"tag_name" text DEFAULT '' NOT NULL,
	"tag_value" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"domain" text DEFAULT '' NOT NULL,
	"mailbox_provider" text DEFAULT '' NOT NULL,
	"shard" smallint DEFAULT 0 NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"bounced" integer DEFAULT 0 NOT NULL,
	"complained" integer DEFAULT 0 NOT NULL,
	"opened" integer DEFAULT 0 NOT NULL,
	"clicked" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "email_metric_pkey" PRIMARY KEY("environment_id","hour_start","tag_name","tag_value","category","domain","mailbox_provider","shard")
);
--> statement-breakpoint
ALTER TABLE "email_metric" ADD CONSTRAINT "email_metric_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_metric_hour_idx" ON "email_metric" USING btree ("hour_start");