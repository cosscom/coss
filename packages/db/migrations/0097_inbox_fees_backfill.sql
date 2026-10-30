-- Live inboxes created before inboxes were charged: their first day is charged by the next fee run.
UPDATE "inbox" SET "next_fee_at" = now()
FROM "environment"
WHERE "environment"."id" = "inbox"."environment_id"
  AND "environment"."mode" = 'live'
  AND "inbox"."next_fee_at" IS NULL;
