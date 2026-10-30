ALTER TABLE "email_suppression" DROP CONSTRAINT "email_suppression_environment_address_scope_unique";--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "subaccount_id" text;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "subaccount_tenant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email_suppression" ADD COLUMN "subaccount_id" text;--> statement-breakpoint
ALTER TABLE "email_suppression" ADD CONSTRAINT "email_suppression_subaccount_fk" FOREIGN KEY ("subaccount_id","organization_id") REFERENCES "public"."email_subaccount"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_subaccount_send_time_idx" ON "email" USING btree ("subaccount_id",coalesce("sent_at", "created_at")) WHERE "email"."subaccount_id" is not null;--> statement-breakpoint
CREATE INDEX "email_suppression_subaccount_sequence_idx" ON "email_suppression" USING btree ("subaccount_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST) WHERE "email_suppression"."subaccount_id" is not null;--> statement-breakpoint
ALTER TABLE "email_suppression" ADD CONSTRAINT "email_suppression_environment_subaccount_address_scope_unique" UNIQUE NULLS NOT DISTINCT("environment_id","subaccount_id","address","scope");