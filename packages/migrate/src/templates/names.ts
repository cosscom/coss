/**
 * Variable names and sample data for the template converters. Other providers' templates address
 * nested data (`user.name`); coss.com templates have flat names, so paths are flattened with `_`
 * and every name that changed is reported to the customer, whose sends must use the new one.
 */
import {
  MARKETING_PLACEHOLDERS,
  RESERVED_TEMPLATE_NAMES,
  TEMPLATE_VARIABLE_NAME,
} from "@coss/email/templates";

const MAX_NAME_LENGTH = 64;

/** A flat, valid name for a path's segments (`["user", "first-name"]` → `user_first_name`). */
export function flatName(segments: readonly string[]): string {
  let name = segments
    .map((segment) => segment.replace(/[^A-Za-z0-9_]/g, "_"))
    .filter((segment) => segment !== "")
    .join("_");
  if (name === "") name = "value";
  if (/^[0-9]/.test(name)) name = `_${name}`;
  name = name.slice(0, MAX_NAME_LENGTH);
  if (RESERVED_TEMPLATE_NAMES.has(name)) name = `${name}_`;
  return name;
}

/**
 * Hands out unique names: the first path to want a name gets it, later ones get `_2`, `_3`, …
 * Names in `reserved` are never handed out (the marketing placeholders, so a provider variable of
 * that name can't shadow coss.com's unsubscribe link).
 */
export class NameAllocator {
  readonly #byKey = new Map<string, string>();
  readonly #taken: Set<string>;

  constructor(reserved: Iterable<string> = []) {
    this.#taken = new Set(reserved);
  }

  /** The name for `key` (a path written with dots), allocating it on first use. */
  nameFor(key: string, segments: readonly string[]): string {
    const known = this.#byKey.get(key);
    if (known !== undefined) return known;
    const base = flatName(segments);
    let name = base;
    for (let suffix = 2; this.#taken.has(name); suffix++) {
      const tail = `_${suffix}`;
      name = `${base.slice(0, MAX_NAME_LENGTH - tail.length)}${tail}`;
    }
    if (!TEMPLATE_VARIABLE_NAME.test(name)) throw new Error(`Allocated an invalid name: ${name}`);
    this.#taken.add(name);
    this.#byKey.set(key, name);
    return name;
  }
}

/** Names a converted template's own variables may not take. */
export const RESERVED_VARIABLE_NAMES: ReadonlySet<string> = new Set([...MARKETING_PLACEHOLDERS]);

export type SampleType = "string" | "number" | "boolean" | "list" | "object" | "unknown";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The value at `segments` inside `sample` (own keys only), or `undefined`. */
export function valueAt(sample: unknown, segments: readonly string[]): unknown {
  let current = sample;
  for (const segment of segments) {
    if (!isRecord(current) || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

export function sampleType(value: unknown): SampleType {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return Number.isFinite(value) ? "number" : "unknown";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "list";
  if (isRecord(value)) return "object";
  return "unknown";
}

/**
 * Sample data as the provider stores it: SendGrid's `test_data` is a JSON string, Postmark's
 * suggested model an object. Anything else counts as no sample.
 */
export function parseSample(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(value) ? value : null;
}
