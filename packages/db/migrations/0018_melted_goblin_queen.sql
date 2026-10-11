CREATE TYPE "public"."content_screening_verdict" AS ENUM('clean', 'flagged', 'blocked', 'error');--> statement-breakpoint
CREATE TABLE "content_screening" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"product" text NOT NULL,
	"subject_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"classifier" text NOT NULL,
	"model" text,
	"verdict" "content_screening_verdict" NOT NULL,
	"enforced" boolean DEFAULT false NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"top_category" text,
	"top_score" real,
	"input_tokens" integer,
	"latency_ms" integer NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_screening_counter" (
	"organization_id" text NOT NULL,
	"product" text NOT NULL,
	"seen" integer DEFAULT 0 NOT NULL,
	"owed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_screening_counter_organization_id_product_pk" PRIMARY KEY("organization_id","product")
);
--> statement-breakpoint
ALTER TABLE "content_screening" ADD CONSTRAINT "content_screening_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_screening_counter" ADD CONSTRAINT "content_screening_counter_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_screening_organization_created_at_idx" ON "content_screening" USING btree ("organization_id","created_at" DESC NULLS LAST);