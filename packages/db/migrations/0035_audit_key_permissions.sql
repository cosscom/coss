-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the audit action a new key
-- now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts), like 0029 did for logs. Only
-- owners and admins create keys, and both may read the organization's audit log.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"audit":["read"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'audit' IS NULL;
