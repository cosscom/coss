CREATE TABLE "risk_assessment_preparation" (
	"environment_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content" jsonb,
	CONSTRAINT "risk_assessment_preparation_environment_id_idempotency_key_pk" PRIMARY KEY("environment_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "risk_assessment_preparation" ADD CONSTRAINT "risk_assessment_preparation_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "risk_assessment_preparation_created_idx" ON "risk_assessment_preparation" USING btree ("created_at");