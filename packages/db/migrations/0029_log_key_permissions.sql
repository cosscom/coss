-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the log action a new key
-- now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts), like 0016 did for reputation.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"log":["read"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'log' IS NULL;
