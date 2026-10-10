ALTER TYPE "public"."email_event_type" ADD VALUE 'email.opened';--> statement-breakpoint
ALTER TYPE "public"."email_event_type" ADD VALUE 'email.clicked';--> statement-breakpoint
CREATE TABLE "email_link" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email_id" text NOT NULL,
	"position" integer NOT NULL,
	"url" text NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"first_clicked_at" timestamp with time zone,
	"last_clicked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_link_email_position_unique" UNIQUE("email_id","position")
);
--> statement-breakpoint
CREATE TABLE "email_tracking_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"category" text,
	"opens" boolean NOT NULL,
	"clicks" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_tracking_rule_environment_category_unique" UNIQUE NULLS NOT DISTINCT("environment_id","category")
);
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "track_opens" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "track_clicks" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "tracking_token" text;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "open_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "first_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "last_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "click_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "first_clicked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "last_clicked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_link" ADD CONSTRAINT "email_link_email_fk" FOREIGN KEY ("email_id","organization_id") REFERENCES "public"."email"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tracking_rule" ADD CONSTRAINT "email_tracking_rule_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_tracking_token_unique" UNIQUE("tracking_token");