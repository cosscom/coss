-- Custom SQL migration file, put your code below! --
-- Every existing domain gets its DMARC report token (`newDmarcReportToken`, schema/domain.ts: 16
-- symbols of the same alphabet). Tokens are published in DNS, so `random()` is enough; 0060
-- then makes the column NOT NULL and unique.
UPDATE "domain"
SET "dmarc_report_token" = (
  SELECT string_agg(substr('abcdefghijkmnpqrstuvwxyz23456789', 1 + floor(random() * 32)::int, 1), '')
  FROM generate_series(1, 16)
  -- Correlate with the row so each row draws its own token.
  WHERE "domain"."id" IS NOT NULL
)
WHERE "dmarc_report_token" IS NULL;
