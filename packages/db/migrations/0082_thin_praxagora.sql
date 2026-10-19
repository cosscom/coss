CREATE TABLE "sms_inbound_receipt" (
	"provider" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_inbound_receipt_provider_provider_message_id_pk" PRIMARY KEY("provider","provider_message_id")
);
--> statement-breakpoint
ALTER TABLE "sms_inbound_receipt" ADD CONSTRAINT "sms_inbound_receipt_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sms_inbound_receipt_created_at_idx" ON "sms_inbound_receipt" USING btree ("created_at");