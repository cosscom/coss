-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the contact actions a
-- new key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts), like 0052 did for hook.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"contact":["create","read","update","delete"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'contact' IS NULL;
