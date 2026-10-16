/**
 * Cloudflare for SaaS custom hostnames: each customer tracking hostname is registered on coss.com's
 * zone, Cloudflare validates it over HTTP (once the customer's CNAME points at the fallback
 * origin), issues and renews its certificate, and proxies `/t/*` to the API.
 * https://developers.cloudflare.com/api/resources/custom_hostnames/
 *
 * Plain `fetch`, no SDK: three endpoints, and tests inject a fake `fetch`.
 */
import {
  type TrackingHostnameProvider,
  type TrackingHostnameState,
  TrackingHostnameTakenError,
} from "../tracking-hostnames.ts";

export type CloudflareConfig = {
  /** An API token limited to the zone, with the SSL and Certificates (custom hostnames) edit permission. */
  apiToken: string;
  zoneId: string;
  /** The zone's fallback origin, which customers CNAME their tracking hostname to. */
  cnameTarget: string;
};

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const API_BASE = "https://api.cloudflare.com/client/v4";
const TIMEOUT_MS = 10_000;
/** "Duplicate custom hostname found." */
const DUPLICATE_HOSTNAME_CODES = new Set([1406]);

/** The parts of a custom hostname object coss.com reads. */
export type CloudflareCustomHostname = {
  id: string;
  hostname: string;
  status?: string;
  verification_errors?: string[];
  ssl?: { status?: string; validation_errors?: { message?: string }[] } | null;
};

type Envelope<T> = {
  success: boolean;
  errors?: { code?: number; message?: string }[];
  result?: T | null;
};

export class CloudflareApiError extends Error {
  readonly status: number;
  readonly codes: number[];

  constructor(status: number, errors: { code?: number; message?: string }[]) {
    const detail = errors.map((e) => `${e.code ?? "?"}: ${e.message ?? ""}`).join("; ");
    super(`Cloudflare API error (HTTP ${status})${detail ? `: ${detail}` : ""}`);
    this.name = "CloudflareApiError";
    this.status = status;
    this.codes = errors.flatMap((e) => (typeof e.code === "number" ? [e.code] : []));
  }
}

// Hostname statuses after which Cloudflare stops trying by itself.
const FAILED_HOSTNAME_STATUSES = new Set([
  "blocked",
  "pending_blocked",
  "deleted",
  "pending_deletion",
  "test_blocked",
  "test_failed",
]);
const ACTIVE_HOSTNAME_STATUSES = new Set(["active", "active_redeploying"]);
const FAILED_SSL_STATUSES = new Set([
  "initializing_timed_out",
  "validation_timed_out",
  "issuance_timed_out",
  "deployment_timed_out",
  "expired",
  "deleted",
]);

/** Maps a custom hostname to coss.com's three states, with the most useful explanation. */
export function customHostnameState(
  hostname: CloudflareCustomHostname,
  cnameTarget: string,
): TrackingHostnameState {
  const status = hostname.status ?? "pending";
  const ssl = hostname.ssl?.status ?? "initializing";
  const message =
    hostname.verification_errors?.find(Boolean) ??
    hostname.ssl?.validation_errors?.find((e) => e.message)?.message ??
    null;
  if (FAILED_HOSTNAME_STATUSES.has(status)) {
    return { status: "failed", message: message ?? "The tracking hostname was refused." };
  }
  if (FAILED_SSL_STATUSES.has(ssl)) {
    return {
      status: "failed",
      message: message ?? "The certificate for the tracking hostname could not be issued.",
    };
  }
  if (ACTIVE_HOSTNAME_STATUSES.has(status) && ssl === "active") {
    return { status: "active", message: null };
  }
  if (status === "moved") {
    return { status: "pending", message: `The CNAME record no longer points to ${cnameTarget}.` };
  }
  return { status: "pending", message };
}

export class CloudflareTrackingHostnameProvider implements TrackingHostnameProvider {
  readonly name = "cloudflare";
  readonly cnameTarget: string;
  readonly #config: CloudflareConfig;
  readonly #fetch: Fetch;
  readonly #baseUrl: string;

  constructor(config: CloudflareConfig, opts: { fetch?: Fetch; baseUrl?: string } = {}) {
    this.#config = config;
    this.cnameTarget = config.cnameTarget;
    this.#fetch = opts.fetch ?? ((input, init) => fetch(input, init));
    this.#baseUrl = opts.baseUrl ?? API_BASE;
  }

  async create(hostname: string): Promise<{ id: string; state: TrackingHostnameState }> {
    try {
      const created = await this.#request<CloudflareCustomHostname>("POST", "", {
        hostname,
        ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
      });
      if (!created) throw new Error("Cloudflare returned no custom hostname.");
      return { id: created.id, state: customHostnameState(created, this.cnameTarget) };
    } catch (error) {
      if (
        error instanceof CloudflareApiError &&
        error.codes.some((code) => DUPLICATE_HOSTNAME_CODES.has(code))
      ) {
        throw new TrackingHostnameTakenError(hostname);
      }
      throw error;
    }
  }

  async get(id: string): Promise<TrackingHostnameState | null> {
    try {
      const found = await this.#request<CloudflareCustomHostname>("GET", `/${id}`);
      return found ? customHostnameState(found, this.cnameTarget) : null;
    } catch (error) {
      if (error instanceof CloudflareApiError && error.status === 404) return null;
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.#request("DELETE", `/${id}`);
    } catch (error) {
      if (error instanceof CloudflareApiError && error.status === 404) return;
      throw error;
    }
  }

  async #request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const url = `${this.#baseUrl}/zones/${encodeURIComponent(this.#config.zoneId)}/custom_hostnames${path}`;
    const res = await this.#fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${this.#config.apiToken}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const envelope = (await res.json().catch(() => null)) as Envelope<T> | null;
    if (!res.ok || !envelope?.success) {
      throw new CloudflareApiError(res.status, envelope?.errors ?? []);
    }
    return envelope.result ?? null;
  }
}
