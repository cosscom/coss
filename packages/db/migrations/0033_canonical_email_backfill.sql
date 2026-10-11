-- Custom SQL migration file, put your code below! --
-- Fills `user.canonical_email` for users created before the column existed, with the rules of
-- `canonicalEmail` (packages/auth/src/email-guard.ts): lower-case; googlemail.com → gmail.com;
-- drop `+tags` at providers that ignore them; drop Gmail's dots. Keep the two in step.
UPDATE "user" AS u
SET "canonical_email" = (
  CASE
    WHEN p.domain IN (
      'gmail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com',
      'mac.com', 'fastmail.com', 'fastmail.fm', 'proton.me', 'protonmail.com', 'pm.me'
    ) THEN split_part(p.local, '+', 1)
    ELSE p.local
  END
) || '@' || p.domain
FROM (
  SELECT
    "id",
    regexp_replace(lower(trim("email")), '@[^@]*$', '') AS local,
    CASE
      WHEN regexp_replace(lower(trim("email")), '^.*@', '') = 'googlemail.com' THEN 'gmail.com'
      ELSE regexp_replace(lower(trim("email")), '^.*@', '')
    END AS domain
  FROM "user"
  WHERE "canonical_email" IS NULL AND "email" LIKE '%@%'
) AS p
WHERE u."id" = p."id";
--> statement-breakpoint
UPDATE "user"
SET "canonical_email" = replace(split_part("canonical_email", '@', 1), '.', '') || '@gmail.com'
WHERE "canonical_email" LIKE '%@gmail.com';
