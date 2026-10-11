-- COSS requires one managed directory per organization. Keep this constraint in a custom
-- migration because auth.ts is regenerated from Better Auth's organization-agnostic schema.
-- Disconnecting connections retain the slot until their users have all been released.
CREATE UNIQUE INDEX "scim_managed_connection_one_live_per_org"
ON "scim_managed_connection" ("provisioning_domain_id")
WHERE "status" IN ('active', 'decommissioning');
