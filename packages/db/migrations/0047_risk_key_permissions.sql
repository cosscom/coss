-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the risk actions a new
-- key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts), like 0043 did for billing.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"risk":["assess","read","feedback"],"riskList":["create","read","delete"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'risk' IS NULL;
