-- API keys store their permissions at creation: grant existing keys the suppression actions that
-- new keys get by default (`defaultPermissions` in packages/auth/src/options.ts).
UPDATE "apikey"
SET "permissions" = ("permissions"::jsonb || '{"suppression":["create","read","delete"]}'::jsonb)::text
WHERE "permissions" IS NOT NULL AND NOT ("permissions"::jsonb ? 'suppression');
