-- Custom SQL migration file, put your code below! --

-- API keys store their permissions at creation time, so every key minted before the domain and
-- webhook endpoint routes existed would get a 403 from them. Grant existing keys the same
-- resources a new key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts).
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"domain":["create","read","verify","delete"],"webhook":["create","read","update","delete"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'domain' IS NULL
   OR NULLIF("permissions", '')::jsonb -> 'webhook' IS NULL;
