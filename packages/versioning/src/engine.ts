import { API_VERSION_FORMAT } from "./versions.ts";

export type JsonObject = Record<string, unknown>;

/** Turns an object of one `object` type from a change's version into the previous version's shape. */
export type ObjectTransform = (object: JsonObject) => JsonObject;

/** Turns a request body written for the previous version into this change's version. */
export type RequestTransform = (body: unknown) => unknown;

/** `"<METHOD> <OpenAPI path template>"`, e.g. `"POST /v1/webhook_endpoints"` or `"PATCH /v1/domains/{id}"`. */
export type RequestKey = `${"POST" | "PATCH" | "PUT" | "DELETE"} /v1/${string}`;

export type VersionChange = {
  /** The first version with the new shape. */
  version: string;
  /** One line, for the changelog and the dashboard's upgrade dialog. */
  title: string;
  /** Markdown: what changed and how to migrate. */
  description: string;
  /**
   * Keyed by a wire object's `object` field (`email`, `domain`, `event` for webhook payloads, …). Objects without
   * an `object` field (recipients, DNS records, event data) belong to the nearest ancestor that has one.
   */
  responses?: Partial<Record<string, ObjectTransform>>;
  requests?: Partial<Record<RequestKey, RequestTransform>>;
};

export type VersionRegistry = {
  versions: readonly string[];
  changes: readonly VersionChange[];
};

export type Versioning = {
  readonly versions: readonly string[];
  readonly latest: string;
  readonly changes: readonly VersionChange[];
  isVersion(value: string): boolean;
  /** The newest known version on or before `pin` (the oldest version when `pin` predates them all). */
  resolve(pin: string): string;
  /** Renders a latest-shape body (a resource, a list, a webhook event) in version `to`. Never mutates `body`. */
  downgrade(body: unknown, to: string): unknown;
  /** Turns a body written for version `from` into the latest shape, for the request `key`. */
  upgradeRequest(key: RequestKey, body: unknown, from: string): unknown;
  /** Whether any change after `from` rewrites requests to `key` (lets callers skip reading the body). */
  hasRequestChanges(key: RequestKey, from: string): boolean;
  /** Changes after `from`, up to and including `to`, newest first. */
  changesBetween(from: string, to: string): VersionChange[];
};

export function createVersioning(registry: VersionRegistry): Versioning {
  const { versions } = registry;
  const latest = versions[versions.length - 1];
  if (latest === undefined) throw new Error("versioning: no API versions");
  versions.forEach((version, index) => {
    if (!API_VERSION_FORMAT.test(version) || Number.isNaN(Date.parse(version))) {
      throw new Error(`versioning: ${version} is not a YYYY-MM-DD date`);
    }
    const previous = versions[index - 1];
    if (previous !== undefined && previous >= version) {
      throw new Error(
        `versioning: versions must be unique and ascending (${previous}, ${version})`,
      );
    }
  });
  const known = new Set(versions);
  for (const change of registry.changes) {
    if (!known.has(change.version))
      throw new Error(
        `versioning: change "${change.title}" names unknown version ${change.version}`,
      );
    if (change.version === versions[0]) {
      throw new Error(`versioning: the oldest version (${change.version}) can't have changes`);
    }
  }
  // Newest first; changes of one version keep their registry order.
  const changes = registry.changes
    .map((change, index) => ({ change, index }))
    .sort((a, b) =>
      a.change.version === b.change.version
        ? a.index - b.index
        : a.change.version > b.change.version
          ? -1
          : 1,
    )
    .map(({ change }) => change);

  const after = (from: string) => changes.filter((change) => change.version > from);

  return {
    versions,
    latest,
    changes,
    isVersion: (value) => known.has(value),
    resolve(pin) {
      let resolved = versions[0] as string;
      for (const version of versions) if (version <= pin) resolved = version;
      return resolved;
    },
    downgrade(body, to) {
      let out: unknown = body;
      for (const change of after(to)) {
        const transforms = change.responses;
        if (transforms) out = walk(out, transforms);
      }
      return out;
    },
    upgradeRequest(key, body, from) {
      let out = body;
      for (const change of after(from).reverse()) {
        const transform = change.requests?.[key];
        if (transform) out = transform(out);
      }
      return out;
    },
    hasRequestChanges: (key, from) =>
      after(from).some((change) => change.requests?.[key] !== undefined),
    changesBetween: (from, to) =>
      changes.filter((change) => change.version > from && change.version <= to),
  };
}

/** Post-order copy: children are rendered first, then the node's own transform (if its `object` has one). */
function walk(value: unknown, transforms: Partial<Record<string, ObjectTransform>>): unknown {
  if (Array.isArray(value)) return value.map((item) => walk(item, transforms));
  if (!isPlainObject(value)) return value;
  const copy: JsonObject = {};
  for (const [key, child] of Object.entries(value)) copy[key] = walk(child, transforms);
  const transform = typeof copy.object === "string" ? transforms[copy.object] : undefined;
  return transform ? transform(copy) : copy;
}

function isPlainObject(value: unknown): value is JsonObject {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * A transform for webhook events (`object: "event"`) that rewrites `data` only for event types starting with
 * `typePrefix` (`"email."`, `"account."`).
 */
export function eventDataTransform(
  typePrefix: string,
  transform: ObjectTransform,
): ObjectTransform {
  return (event) => {
    if (
      typeof event.type !== "string" ||
      !event.type.startsWith(typePrefix) ||
      !isPlainObject(event.data)
    )
      return event;
    return { ...event, data: transform(event.data) };
  };
}

/** Renames `from` to `to` keeping the key's position (wire objects keep a stable key order). */
export function renameKey(object: JsonObject, from: string, to: string): JsonObject {
  if (!(from in object)) return object;
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key === from ? to : key, value]),
  );
}

export function omitKeys(object: JsonObject, ...keys: string[]): JsonObject {
  return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
}
