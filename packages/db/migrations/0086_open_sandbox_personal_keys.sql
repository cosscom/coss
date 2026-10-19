-- Sandbox environments are never billed: open them to members' personal keys, as new projects do.
UPDATE "environment" SET "personal_keys" = true WHERE "mode" = 'sandbox';
