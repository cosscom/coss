/**
 * The test app on a real port, for the framework drivers' end-to-end tests (`integrations/*`):
 * `bun run --cwd apps/api serve:test` (needs TEST_DATABASE_URL, like the tests) prints one JSON
 * line, `{ base_url, sandbox_key, live_key, live_from }`, then serves (on a random port, or
 * `COSS_SERVE_PORT`) until it is stopped. Queued sends are dispatched to the fake providers every
 * 200 ms, as the worker would.
 */
import "./setup.ts";
import { EmailError } from "@coss/email";
import { createVerifiedDomain } from "@coss/email/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { createTestApp } from "./helpers.ts";

const tenant = await createTestTenant();
const domain = await createVerifiedDomain(tenant.organization.id);
const { app, emailService, queue } = createTestApp();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.COSS_SERVE_PORT ?? 0),
  fetch: app.fetch,
});

let dispatching = false;
const timer = setInterval(async () => {
  if (dispatching) return;
  dispatching = true;
  try {
    for (const job of queue.jobs.splice(0)) {
      try {
        await emailService.dispatch(job);
      } catch (error) {
        // The in-memory queue gets a job inside the send's transaction (pg-boss only at its commit),
        // so a job can come before its email does: keep it for the next round.
        if (error instanceof EmailError && error.code === "not_found") queue.jobs.push(job);
        else console.error("[serve] dispatch failed", error);
      }
    }
  } finally {
    dispatching = false;
  }
}, 200);

console.log(
  JSON.stringify({
    base_url: `http://127.0.0.1:${server.port}`,
    sandbox_key: tenant.sandboxKey,
    live_key: tenant.liveKey,
    live_from: `Acme <hello@${domain.name}>`,
  }),
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    clearInterval(timer);
    server.stop(true);
    process.exit(0);
  });
}
