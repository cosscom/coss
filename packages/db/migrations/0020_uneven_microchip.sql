CREATE TABLE "email_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"idempotency_key" text,
	"request_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_batch_environment_idempotency_key_unique" UNIQUE("environment_id","idempotency_key"),
	CONSTRAINT "email_batch_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "batch_index" integer;--> statement-breakpoint
ALTER TABLE "email_batch" ADD CONSTRAINT "email_batch_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_batch_fk" FOREIGN KEY ("batch_id","organization_id") REFERENCES "public"."email_batch"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_batch_idx" ON "email" USING btree ("batch_id","batch_index") WHERE "email"."batch_id" is not null;