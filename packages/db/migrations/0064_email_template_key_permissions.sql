-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the email template
-- actions a new key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts), like 0054.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"emailTemplate":["create","read","update","delete","publish"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'emailTemplate' IS NULL;
