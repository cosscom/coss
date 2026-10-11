-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the log drain actions a
-- new key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts), like 0029 did for logs.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"logDrain":["create","read","update","delete"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'logDrain' IS NULL;
