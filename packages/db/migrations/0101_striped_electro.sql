ALTER TABLE "content_screening_counter" ADD COLUMN "group_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_screening_counter" DROP CONSTRAINT "content_screening_counter_organization_id_product_pk";--> statement-breakpoint
ALTER TABLE "content_screening_counter" ADD CONSTRAINT "content_screening_counter_organization_id_product_group_id_pk" PRIMARY KEY("organization_id","product","group_id");--> statement-breakpoint
ALTER TABLE "content_screening" ADD COLUMN "group_id" text;
