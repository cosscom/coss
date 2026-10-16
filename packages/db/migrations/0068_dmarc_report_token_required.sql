ALTER TABLE "domain" ALTER COLUMN "dmarc_report_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "domain" ADD CONSTRAINT "domain_dmarc_report_token_unique" UNIQUE("dmarc_report_token");