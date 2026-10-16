-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the broadcast actions a
-- new key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts), like 0075 did for contact.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"broadcast":["create","read","update","delete","send"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'broadcast' IS NULL;
