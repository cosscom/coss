-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the received email action a
-- new key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts), like 0040 did for log drains.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"receivedEmail":["delete"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'receivedEmail' IS NULL;
