CREATE TABLE "email_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email_id" text NOT NULL,
	"position" integer NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"content_id" text,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"content" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_attachment_email_position_unique" UNIQUE("email_id","position")
);
--> statement-breakpoint
ALTER TABLE "email_attachment" ADD CONSTRAINT "email_attachment_email_fk" FOREIGN KEY ("email_id","organization_id") REFERENCES "public"."email"("id","organization_id") ON DELETE cascade ON UPDATE no action;