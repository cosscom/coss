-- Custom SQL migration file, put your code below! --
-- API keys store their permissions at creation time: grant existing keys the risk rule and
-- settings actions a new key now gets (`API_KEY_PERMISSIONS`, packages/auth/src/constants.ts),
-- like 0047 did for risk.
UPDATE "apikey"
SET "permissions" = (
  COALESCE(NULLIF("permissions", '')::jsonb, '{"email":["send","read"]}'::jsonb)
  || '{"risk":["assess","read","feedback","update"],"riskRule":["create","read","update","delete"]}'::jsonb
)::text
WHERE NULLIF("permissions", '')::jsonb -> 'riskRule' IS NULL;
