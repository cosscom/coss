DROP INDEX "email_scheduled_at_idx";--> statement-breakpoint
CREATE INDEX "email_scheduled_due_idx" ON "email" USING btree ("scheduled_at") WHERE "email"."status" = 'scheduled';