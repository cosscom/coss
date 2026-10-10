import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { db, pool } from "@coss/db";
import { newId } from "@coss/db/id";
import { type PgBoss, startJobBoss } from "@coss/db/jobs";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  type EmailDispatchJob,
  ensureEmailDispatchQueue,
  pgBossDispatchQueue,
  runDispatchJob,
  workEmailDispatchQueue,
} from "../src/dispatch.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { getEmail, listEmailLinks } from "../src/read.ts";
import { createEmailService } from "../src/service.ts";
import { trackingUrls } from "../src/testing.ts";
import { params, sendEnvironment } from "./helpers.ts";

// A queue of our own: the test database is shared, and other runs' jobs must not reach us.
const name = `email-dispatch-test-${uniqueSuffix()}`;
let producer: PgBoss;
let worker: PgBoss;

beforeAll(async () => {
  producer = await startJobBoss();
  worker = await startJobBoss({ worker: true });
  await ensureEmailDispatchQueue(producer, name);
});

afterAll(async () => {
  await worker.stop({ graceful: false });
  await producer.deleteQueue(name);
  await producer.stop({ graceful: false });
});

function setup(trackingBaseUrl?: string) {
  const provider = new FakeEmailProvider({ log: false });
  const queue = pgBossDispatchQueue(producer, name);
  const service = createEmailService({
    liveProvider: provider,
    sandboxProvider: provider,
    queue,
    trackingBaseUrl,
  });
  return { provider, queue, service };
}

const jobsFor = (emailId: string) => producer.findJobs<EmailDispatchJob>(name, { key: emailId });

describe("pg-boss dispatch queue", () => {
  test("cold-cache enqueues complete when transactions occupy the entire app pool", async () => {
    const coldName = `email-dispatch-test-${uniqueSuffix()}`;
    await ensureEmailDispatchQueue(producer, coldName);
    const queue = pgBossDispatchQueue(producer, coldName);
    const count = pool.options.max;
    const ready = Promise.withResolvers<void>();
    let started = 0;
    // Bound the old deadlock so a regression fails instead of hanging the test process.
    const previousTimeout = pool.options.connectionTimeoutMillis;
    pool.options.connectionTimeoutMillis = 1_000;
    try {
      const results = await Promise.allSettled(
        Array.from({ length: count }, () =>
          db.transaction(async (tx) => {
            if (++started === count) ready.resolve();
            await ready.promise;
            await queue.enqueue(tx, { organizationId: newId("org"), emailId: newId("email") });
          }),
        ),
      );
      expect(results.every((result) => result.status === "fulfilled")).toBe(true);
      expect(await producer.findJobs(coldName)).toHaveLength(count);
    } finally {
      pool.options.connectionTimeoutMillis = previousTimeout;
      await producer.deleteQueue(coldName);
    }
  });

  test("a send commits its dispatch job with the email", async () => {
    const tenant = await createTestTenant();
    const { service, provider } = setup();

    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
    });

    expect(email.status).toBe("queued");
    const jobs = await jobsFor(email.id);
    expect(jobs.map((job) => [job.state, job.data])).toEqual([
      ["created", { organizationId: tenant.organization.id, emailId: email.id }],
    ]);
    expect(provider.sent).toHaveLength(0);
  });

  test("a rolled-back transaction leaves no job, and an email has one waiting job", async () => {
    const tenant = await createTestTenant();
    const { queue } = setup();
    const job = { organizationId: tenant.organization.id, emailId: newId("email") };

    const rolledBack = await db
      .transaction(async (tx) => {
        await queue.enqueue(tx, job);
        throw new Error("rollback");
      })
      .catch((error: Error) => error.message);
    expect(rolledBack).toBe("rollback");
    expect(await jobsFor(job.emailId)).toEqual([]);

    await db.transaction((tx) => queue.enqueue(tx, job));
    await db.transaction((tx) => queue.enqueue(tx, job));
    expect(await jobsFor(job.emailId)).toHaveLength(1);
  });

  test("the worker dispatches queued emails", async () => {
    const tenant = await createTestTenant();
    const { service, provider } = setup("https://api.coss.test");
    await workEmailDispatchQueue(worker, service, { name, concurrency: 2 });

    const html = '<p><a href="https://example.com">one<p>two</a>';
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ html, tracking: { opens: true, clicks: true } }),
    });

    const read = () =>
      getEmail({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        id: email.id,
      });
    const deadline = Date.now() + 10_000;
    while ((await read())?.status === "queued" && Date.now() < deadline) {
      await Bun.sleep(50);
    }
    expect(await read()).toMatchObject({ status: "sent", recipients: [{ status: "delivered" }] });
    // The queue also holds the earlier tests' jobs; each email is sent once.
    expect(provider.sent.filter((message) => message.emailId === email.id)).toHaveLength(1);
    const delivered = provider.sent.find((message) => message.emailId === email.id);
    const urls = trackingUrls(delivered?.html ?? "");
    expect(urls.open).toStartWith("https://api.coss.test/t/o/");
    expect(urls.clicks).toHaveLength(1);
    expect((await read())?.html).toBe(html);
    const links = await listEmailLinks({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      emailId: email.id,
    });
    expect(links?.links).toEqual([
      expect.objectContaining({ position: 0, url: "https://example.com" }),
    ]);
  });

  test("a job for an email that no longer exists completes", async () => {
    const tenant = await createTestTenant();
    const { service } = setup();
    const data = { organizationId: tenant.organization.id, emailId: newId("email") };
    await expect(runDispatchJob(service, { data })).resolves.toBeUndefined();
  });
});
