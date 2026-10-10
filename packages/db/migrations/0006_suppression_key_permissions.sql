-- Custom SQL migration file, put your code below! --

-- API keys store their permissions at creation time: grant existing keys the suppression actions a
-- new key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts). Runs after 0004, which
-- gave every key a permissions object.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"suppression":["create","read","delete"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'suppression' IS NULL;
