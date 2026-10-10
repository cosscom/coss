import { pool } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import {
  createEmailService,
  type DomainDeps,
  type EmailService,
  FakeEmailProvider,
  FakeIdentityProvider,
} from "@coss/email";
import type { SendEmailRequestInput } from "@coss/email/schemas";
import { createVerifiedDomain } from "@coss/email/testing";
import type { ApiKeyContext } from "@coss/tenancy";
import { decryptSecret } from "@coss/webhooks";
import { TEST_SECRETS_KEY, testManagementDeps } from "@coss/webhooks/testing";
import { createApp } from "../src/app.ts";
import type { ErrorEnvelopeBody } from "../src/errors.ts";

export const REQUEST_ID = /^req_[0-7][0-9a-hjkmnp-tv-z]{25}$/;

/** Origin of the tracking URLs `createTestApp` puts into emails (`app.request` ignores it). */
export const TRACKING_BASE_URL = "http://api.test";

/**
 * An app whose live and sandbox providers are separate, silent fakes. Domains verify without DNS
 * and webhook endpoints may use local `http://` URLs.
 */
export function createTestApp(opts: { emailService?: EmailService; domainDeps?: DomainDeps } = {}) {
  const liveProvider = new FakeEmailProvider({ log: false });
  const sandboxProvider = new FakeEmailProvider({ log: false });
  const identity = new FakeIdentityProvider();
  const app = createApp({
    emailService:
      opts.emailService ??
      createEmailService({ liveProvider, sandboxProvider, trackingBaseUrl: TRACKING_BASE_URL }),
    domainDeps: opts.domainDeps ?? { identity, dns: null },
    webhookDeps: testManagementDeps,
  });
  return { app, liveProvider, sandboxProvider, identity };
}

export type TestApp = ReturnType<typeof createTestApp>["app"];

export function emailBody(overrides: Partial<SendEmailRequestInput> = {}): SendEmailRequestInput {
  return {
    from: "Acme <hello@acme.com>",
    to: "user@example.com",
    subject: "Welcome",
    text: "Hello!",
    ...overrides,
  };
}

/** A From address on a new verified domain of the organization, as live keys require. */
export async function domainFrom(organizationId: string): Promise<string> {
  const domain = await createVerifiedDomain(organizationId);
  return `Acme <hello@${domain.name}>`;
}

export function sendEmail(
  app: TestApp,
  key: string | null,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return Promise.resolve(
    app.request("/v1/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key === null ? {} : { Authorization: `Bearer ${key}` }),
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

/**
 * A request to the API with an API key (`key: null` sends none). Bodies are JSON; a string body
 * is sent verbatim, so tests can post malformed JSON.
 */
export function apiRequest(
  app: TestApp,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  opts: { key?: string | null; body?: unknown; headers?: Record<string, string> } = {},
): Promise<Response> {
  const key = opts.key ?? null;
  return Promise.resolve(
    app.request(path, {
      method,
      headers: {
        ...(opts.body !== undefined && { "Content-Type": "application/json" }),
        ...(key === null ? {} : { Authorization: `Bearer ${key}` }),
        ...opts.headers,
      },
      ...(opts.body !== undefined && {
        body: typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
      }),
    }),
  );
}

/** A domain name no other test uses (tests never truncate). */
export function uniqueDomainName(): string {
  return `t-${uniqueSuffix()}.coss.test`;
}

export function getEmailById(app: TestApp, key: string, id: string): Promise<Response> {
  return Promise.resolve(
    app.request(`/v1/emails/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    }),
  );
}

/** Parses an error response and checks the invariants every error envelope shares. */
export async function errorOf(response: Response): Promise<ErrorEnvelopeBody["error"]> {
  const requestId = response.headers.get("x-request-id");
  if (!requestId || !REQUEST_ID.test(requestId)) {
    throw new Error(`missing or malformed X-Request-Id: ${requestId}`);
  }
  const body = (await response.json()) as ErrorEnvelopeBody;
  if (body.error.request_id !== requestId) {
    throw new Error(`envelope request_id ${body.error.request_id} !== header ${requestId}`);
  }
  return body.error;
}

// apps/api does not depend on drizzle-orm, so fixtures are adjusted with parameterized SQL on the
// same pool Drizzle uses.

export async function apiKeyIdForEnvironment(environmentId: string): Promise<string> {
  const { rows } = await pool.query<{ api_key_id: string }>(
    "select api_key_id from environment_api_key where environment_id = $1",
    [environmentId],
  );
  if (rows.length !== 1 || !rows[0]) {
    throw new Error(`expected exactly one key bound to ${environmentId}, got ${rows.length}`);
  }
  return rows[0].api_key_id;
}

export async function setKeyPermissions(
  apiKeyId: string,
  permissions: Record<string, string[]>,
): Promise<void> {
  await pool.query("update apikey set permissions = $1 where id = $2", [
    JSON.stringify(permissions),
    apiKeyId,
  ]);
}

export async function setKeyEnabled(apiKeyId: string, enabled: boolean): Promise<void> {
  await pool.query("update apikey set enabled = $1 where id = $2", [enabled, apiKeyId]);
}

export async function deleteKey(apiKeyId: string): Promise<void> {
  await pool.query("delete from apikey where id = $1", [apiKeyId]);
}

/** A webhook endpoint as stored, including the signing secret the API only returns on create. */
export async function endpointRow(id: string): Promise<{
  url: string;
  description: string | null;
  eventTypes: string[];
  enabled: boolean;
  secret: string;
}> {
  const { rows } = await pool.query<{
    url: string;
    description: string | null;
    event_types: string[];
    enabled: boolean;
    secret_ciphertext: string;
  }>(
    "select url, description, event_types, enabled, secret_ciphertext from webhook_endpoint where id = $1",
    [id],
  );
  const row = rows[0];
  if (!row) throw new Error(`no webhook endpoint ${id}`);
  return {
    url: row.url,
    description: row.description,
    eventTypes: row.event_types,
    enabled: row.enabled,
    secret: decryptSecret(row.secret_ciphertext, TEST_SECRETS_KEY),
  };
}

/** Backdates a domain's verification window, so the next check gives up on it. */
export async function expireDomainVerification(domainId: string): Promise<void> {
  await pool.query(
    "update domain set verification_started_at = now() - interval '80 hours' where id = $1",
    [domainId],
  );
}

export async function setEmailStatus(emailId: string, status: "queued" | "sent" | "failed") {
  await pool.query("update email set status = $1 where id = $2", [status, emailId]);
}

export function authContext(overrides: Partial<ApiKeyContext> = {}): ApiKeyContext {
  return {
    apiKeyId: "key_00000000000000000000000000",
    organizationId: "org_00000000000000000000000000",
    projectId: "proj_00000000000000000000000000",
    environmentId: "env_00000000000000000000000000",
    mode: "sandbox",
    ...overrides,
  };
}
