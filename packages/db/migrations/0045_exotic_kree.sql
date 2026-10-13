CREATE INDEX "email_organization_send_time_idx" ON "email" USING btree ("organization_id",coalesce("sent_at", "created_at"));--> statement-breakpoint
-- Reputation rollups were keyed by the hour emails were created; they are now keyed by the hour
-- they were sent. Drop them: the next evaluation of each organization recounts its window.
DELETE FROM "email_reputation_rollup";
