CREATE INDEX "admin_audit_event_created_at_idx" ON "admin_audit_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "content_screening_created_at_idx" ON "content_screening" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_created_at_idx" ON "email" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_message_created_at_idx" ON "webhook_message" USING btree ("created_at");