/**
 * The browser SDKs post their envelopes to the dashboard (same origin on coss.com for both zones),
 * which forwards them to Sentry: no third-party origin in the CSP, nothing for ad blockers to block,
 * and the DSN is read at runtime (images are built once for every stage). Only envelopes for the
 * configured DSN are forwarded, so the route is no open relay.
 */

/** Same-origin path of the tunnel (POST) and of the browser configuration (GET). */
export const SENTRY_TUNNEL_PATH = "/api/monitoring";

/** Largest envelope forwarded. Browser events are a few KB; there is no session replay. */
export const MAX_ENVELOPE_BYTES = 1024 * 1024;

type ParsedDsn = { origin: string; pathPrefix: string; publicKey: string; projectId: string };

/** `https://<key>@<host>[/<prefix>]/<project id>`, or `null`. */
export function parseDsn(dsn: string): ParsedDsn | null {
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }
  const segments = url.pathname.split("/").filter(Boolean);
  const projectId = segments.pop();
  if (!url.username || !projectId || !/^\d+$/.test(projectId)) return null;
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return {
    origin: url.origin,
    pathPrefix: segments.length ? `/${segments.join("/")}` : "",
    publicKey: url.username,
    projectId,
  };
}

/** Sentry's ingestion endpoint for envelopes of `dsn`. */
export function envelopeEndpoint(dsn: ParsedDsn): string {
  return `${dsn.origin}${dsn.pathPrefix}/api/${dsn.projectId}/envelope/`;
}

/**
 * Where to forward `envelope` (the raw request body): the endpoint of `configuredDsn` when the
 * envelope's header names that same project and key, else `null`.
 */
export function tunnelDestination(envelope: Uint8Array, configuredDsn: string): string | null {
  const configured = parseDsn(configuredDsn);
  if (!configured) return null;
  const newline = envelope.indexOf(0x0a);
  const headerText = new TextDecoder().decode(
    newline === -1 ? envelope : envelope.subarray(0, newline),
  );
  let header: unknown;
  try {
    header = JSON.parse(headerText);
  } catch {
    return null;
  }
  const dsn =
    header && typeof header === "object" && "dsn" in header && typeof header.dsn === "string"
      ? parseDsn(header.dsn)
      : null;
  if (
    !dsn ||
    dsn.origin !== configured.origin ||
    dsn.pathPrefix !== configured.pathPrefix ||
    dsn.publicKey !== configured.publicKey ||
    dsn.projectId !== configured.projectId
  ) {
    return null;
  }
  return envelopeEndpoint(configured);
}
