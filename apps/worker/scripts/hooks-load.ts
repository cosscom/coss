/**
 * Load test of Hooks against the test database (TEST_DATABASE_URL, a `*_test` database):
 *   bun --env-file=../../.env scripts/hooks-load.ts [--applications 20] [--endpoints 3]
 *     [--messages 2000] [--concurrency 100] [--fail-rate 0]
 * Creates a throwaway organization, applications and endpoints pointing at a receiver in this
 * process, sends the messages through the service (no API, no quotas), then runs the delivery loop
 * until nothing is due, and reports send and delivery throughput and the claim query's plan.
 * Refuses to run in production.
 */
// First: points @coss/db at the test database (and refuses anything not named `*_test`).
import "@coss/db/testing";
import { db } from "@coss/db";
import {
  createHookApplication,
  createHookEndpoint,
  type HookApplicationRow,
  runDueHookDeliveries,
  sendHookMessage,
} from "@coss/hooks";
import { createTestTenant } from "@coss/tenancy/testing";
import { createWebhookSender, parseSecretsKeys } from "@coss/webhooks";
import { sql } from "drizzle-orm";

if (process.env.NODE_ENV === "production") throw new Error("Not in production.");

function option(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  const value = index === -1 ? undefined : Number(process.argv[index + 1]);
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

const applications = option("applications", 20);
const endpointsPer = option("endpoints", 3);
const messages = option("messages", 2000);
const concurrency = option("concurrency", 100);
const failRate = option("fail-rate", 0);

let received = 0;
const receiver = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch() {
    received++;
    return new Response("ok", { status: Math.random() < failRate ? 500 : 200 });
  },
});

const secretsKeys = parseSecretsKeys(process.env.WEBHOOK_SECRETS_KEY ?? "");
const deps = { secretsKeys, allowInsecureUrls: true };
const tenant = await createTestTenant();
const scope = { organizationIds: [tenant.organization.id] };
console.info(`organization ${tenant.organization.id}`);

const apps: HookApplicationRow[] = [];
for (let i = 0; i < applications; i++) {
  const application = await createHookApplication({
    organizationId: tenant.organization.id,
    environmentId: tenant.production.id,
    name: `Load ${i}`,
    uid: `load_${i}`,
  });
  for (let j = 0; j < endpointsPer; j++) {
    await createHookEndpoint(
      {
        organizationId: tenant.organization.id,
        environmentId: tenant.production.id,
        applicationId: application.id,
        url: `http://127.0.0.1:${receiver.port}/a${i}/e${j}`,
      },
      deps,
    );
  }
  apps.push(application);
}

let started = performance.now();
const sendConcurrency = 20;
let next = 0;
await Promise.all(
  Array.from({ length: sendConcurrency }, async () => {
    while (next < messages) {
      const index = next++;
      await sendHookMessage({
        application: apps[index % apps.length] as HookApplicationRow,
        eventType: "load.test",
        payload: { index, at: Date.now() },
      });
    }
  }),
);
const sendSeconds = (performance.now() - started) / 1000;
console.info(
  `sent ${messages} messages in ${sendSeconds.toFixed(1)} s (${(messages / sendSeconds).toFixed(0)}/s, ${messages * endpointsPer} deliveries)`,
);

const plan = await db.execute<{ "QUERY PLAN": string }>(sql`
  explain select d.message_created_at, d.id from hook_delivery d
  where d.status = 'pending' and d.next_attempt_at <= now()
  order by d.next_attempt_at limit 800
`);
console.info("claim scan plan:");
for (const row of plan.rows.slice(0, 8)) console.info(`  ${row["QUERY PLAN"]}`);

const send = createWebhookSender({ allowPrivateNetworks: true });
started = performance.now();
let runs = 0;
let claimed = 0;
let runTime = 0;
for (;;) {
  const runStarted = performance.now();
  const count = await runDueHookDeliveries(
    { limit: 200, concurrency, scope },
    { secretsKeys, send },
  );
  runTime += performance.now() - runStarted;
  if (count === 0) break;
  runs++;
  claimed += count;
}
const deliverSeconds = (performance.now() - started) / 1000;
console.info(
  `attempted ${claimed} deliveries (${received} requests received) in ${deliverSeconds.toFixed(1)} s: ` +
    `${(claimed / deliverSeconds).toFixed(0)}/s, ${runs} runs of ${(runTime / Math.max(runs, 1)).toFixed(0)} ms`,
);
receiver.stop(true);
process.exit(0);
