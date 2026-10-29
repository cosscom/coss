ALTER TABLE "email_tenant" DROP CONSTRAINT "email_tenant_name_unique";--> statement-breakpoint
ALTER TABLE "email_tenant" DROP CONSTRAINT "email_tenant_organization_id_stream_pk";--> statement-breakpoint
ALTER TABLE "email_tenant" ADD PRIMARY KEY ("tenant_name");--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "subaccount_id" text;--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "shared_with_subaccounts" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email_tenant" ADD COLUMN "subaccount_id" text;--> statement-breakpoint
ALTER TABLE "domain" ADD CONSTRAINT "domain_subaccount_fk" FOREIGN KEY ("subaccount_id","organization_id") REFERENCES "public"."email_subaccount"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tenant" ADD CONSTRAINT "email_tenant_subaccount_fk" FOREIGN KEY ("subaccount_id","organization_id") REFERENCES "public"."email_subaccount"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domain_subaccount_idx" ON "domain" USING btree ("subaccount_id") WHERE "domain"."subaccount_id" is not null;--> statement-breakpoint
ALTER TABLE "email_tenant" ADD CONSTRAINT "email_tenant_owner_stream_unique" UNIQUE NULLS NOT DISTINCT("organization_id","subaccount_id","stream");--> statement-breakpoint
ALTER TABLE "domain" ADD CONSTRAINT "domain_shared_not_subaccount" CHECK (not ("domain"."shared_with_subaccounts" and "domain"."subaccount_id" is not null));