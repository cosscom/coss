CREATE TABLE "sign_builder_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"template_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"api_key_id" text,
	"created_by_user_id" text,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_builder_session_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sign_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"name" text NOT NULL,
	"title" text,
	"message" text,
	"signing_order" "sign_signing_order" DEFAULT 'parallel' NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_template_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "sign_template_document" (
	"template_id" text NOT NULL,
	"document_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "sign_template_document_template_id_position_pk" PRIMARY KEY("template_id","position"),
	CONSTRAINT "sign_template_document_unique" UNIQUE("template_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "sign_template_field" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" text NOT NULL,
	"role" text NOT NULL,
	"document" integer NOT NULL,
	"type" "sign_field_type" NOT NULL,
	"page" integer NOT NULL,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	"width" double precision NOT NULL,
	"height" double precision NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"label" text,
	"merge_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sign_field" ADD COLUMN "prefilled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sign_request" ADD COLUMN "template_id" text;--> statement-breakpoint
ALTER TABLE "sign_builder_session" ADD CONSTRAINT "sign_builder_session_template_fk" FOREIGN KEY ("template_id","organization_id") REFERENCES "public"."sign_template"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_template" ADD CONSTRAINT "sign_template_environment_fk" FOREIGN KEY ("environment_id","organization_id") REFERENCES "public"."environment"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_template_document" ADD CONSTRAINT "sign_template_document_template_fk" FOREIGN KEY ("template_id","organization_id") REFERENCES "public"."sign_template"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_template_document" ADD CONSTRAINT "sign_template_document_document_fk" FOREIGN KEY ("document_id","organization_id") REFERENCES "public"."sign_document"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_template_field" ADD CONSTRAINT "sign_template_field_template_fk" FOREIGN KEY ("template_id","organization_id") REFERENCES "public"."sign_template"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sign_builder_session_expires_at_idx" ON "sign_builder_session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sign_template_environment_created_at_idx" ON "sign_template" USING btree ("environment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sign_template_document_document_idx" ON "sign_template_document" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "sign_template_field_template_idx" ON "sign_template_field" USING btree ("template_id");