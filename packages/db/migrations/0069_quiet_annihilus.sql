CREATE TABLE "webhook_listener" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_version" text NOT NULL,
	"event_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"description" text,
	"created_by_api_key_id" text,
	"last_polled_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_listener_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_listener_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"listener_id" text NOT NULL,
	"message_id" text NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"handed_out_count" integer DEFAULT 0 NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"status_code" integer,
	"duration_ms" integer,
	"error" text,
	"forwarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_listener_delivery_message_listener_unique" UNIQUE("message_id","listener_id"),
	CONSTRAINT "webhook_listener_delivery_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "webhook_listener" ADD CONSTRAINT "webhook_listener_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_listener_delivery" ADD CONSTRAINT "webhook_listener_delivery_listener_fk" FOREIGN KEY ("listener_id","organization_id") REFERENCES "public"."webhook_listener"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_listener_delivery" ADD CONSTRAINT "webhook_listener_delivery_message_fk" FOREIGN KEY ("message_id","organization_id") REFERENCES "public"."webhook_message"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_listener_environment_expires_idx" ON "webhook_listener" USING btree ("environment_id","expires_at");--> statement-breakpoint
CREATE INDEX "webhook_listener_expires_at_idx" ON "webhook_listener" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "webhook_listener_delivery_pending_idx" ON "webhook_listener_delivery" USING btree ("listener_id","created_at","id") WHERE "webhook_listener_delivery"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "webhook_listener_delivery_listener_idx" ON "webhook_listener_delivery" USING btree ("listener_id");