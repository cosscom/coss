ALTER TABLE "user" ADD COLUMN "canonical_email" text;--> statement-breakpoint
CREATE INDEX "user_canonicalEmail_idx" ON "user" USING btree ("canonical_email");