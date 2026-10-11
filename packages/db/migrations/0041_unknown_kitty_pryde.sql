DROP INDEX "email_suppression_environment_id_idx";--> statement-breakpoint
DROP INDEX "admin_audit_event_target_idx";--> statement-breakpoint
DROP INDEX "admin_audit_event_organization_idx";--> statement-breakpoint
DROP INDEX "org_audit_event_organization_idx";--> statement-breakpoint
DROP INDEX "org_audit_event_organization_action_idx";--> statement-breakpoint
ALTER TABLE "admin_audit_event" ADD COLUMN "sequence" bigint NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "admin_audit_event_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "email_suppression" ADD COLUMN "sequence" bigint NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "email_suppression_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "org_audit_event" ADD COLUMN "sequence" bigint NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "org_audit_event_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1);--> statement-breakpoint
CREATE INDEX "email_suppression_environment_sequence_idx" ON "email_suppression" USING btree ("environment_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_event_target_idx" ON "admin_audit_event" USING btree ("target_type","target_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_event_organization_idx" ON "admin_audit_event" USING btree ("organization_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST) WHERE "admin_audit_event"."organization_id" is not null;--> statement-breakpoint
CREATE INDEX "org_audit_event_organization_idx" ON "org_audit_event" USING btree ("organization_id","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "org_audit_event_organization_action_idx" ON "org_audit_event" USING btree ("organization_id","action","created_at" DESC NULLS LAST,"sequence" DESC NULLS LAST);