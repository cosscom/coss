-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the reputation action a
-- new key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts). Runs after 0004, which
-- gave every key a permissions object.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"reputation":["read"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'reputation' IS NULL;
