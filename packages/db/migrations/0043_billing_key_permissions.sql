-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the billing read access a
-- new key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts), like 0040 did for log drains.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"billing":["read"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'billing' IS NULL;
