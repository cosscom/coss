CREATE TABLE "hook_delivery_rollup" (
	"organization_id" text NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"succeeded" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "hook_delivery_rollup_pkey" PRIMARY KEY("organization_id","hour")
);
--> statement-breakpoint
ALTER TABLE "hook_delivery_rollup" ADD CONSTRAINT "hook_delivery_rollup_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hook_delivery_rollup_hour_idx" ON "hook_delivery_rollup" USING btree ("hour");