/**
 * CSV for contacts. Exports have a header row (`email,first_name,last_name,status`, then one
 * column per custom property, then `created_at,id`) and can be imported again unchanged; imports
 * also accept other tools' exports (an `email` column, `First Name`-style headers) and
 * header-less files whose first column is the address. Columns that are neither a built-in field
 * nor a custom property are reported, not imported.
 */
import type {
  ContactImportEntryInput,
  ContactOutput,
  ContactPropertyType,
} from "./contact-schemas.ts";
import { emailAddressProblem } from "./schemas.ts";
import { ADDRESS_HEADERS, csvField, csvRecords, unguard, unguardExact } from "./suppression-csv.ts";

const LEADING = ["email", "first_name", "last_name", "status"] as const;
const TRAILING = ["created_at", "id"] as const;

export function contactCsvHeader(keys: string[]): string {
  return `${[...LEADING, ...keys, ...TRAILING].map(csvField).join(",")}\r\n`;
}

export function contactCsvRow(contact: ContactOutput, keys: string[]): string {
  const fields = [
    contact.email,
    contact.first_name ?? "",
    contact.last_name ?? "",
    contact.status,
    ...keys.map((key) => {
      const value = contact.properties[key];
      return value === undefined ? "" : String(value);
    }),
    contact.created_at,
    contact.id,
  ];
  return `${fields.map(csvField).join(",")}\r\n`;
}

/** `First Name`, `first-name`, `firstName` → `first_name`. */
function normalizeHeader(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

const FIRST_NAME_HEADERS = new Set(["first_name", "firstname", "given_name"]);
const LAST_NAME_HEADERS = new Set(["last_name", "lastname", "family_name", "surname"]);
const STATUS_HEADERS = new Set(["status", "subscribed"]);
const IGNORED_HEADERS = new Set(["created_at", "id", "updated_at"]);
/** Every header read as a built-in column; each is a reserved property key. */
export const BUILT_IN_CSV_HEADERS: readonly string[] = [
  ...[...ADDRESS_HEADERS].filter((name) => !name.includes(" ")),
  ...FIRST_NAME_HEADERS,
  ...LAST_NAME_HEADERS,
  ...STATUS_HEADERS,
  ...IGNORED_HEADERS,
  ...LEADING,
  ...TRAILING,
];

export type ContactCsvEntry = { line: number; entry: ContactImportEntryInput };

/** A property value from its CSV text (`undefined`: left out, the contact keeps its value). */
function propertyValue(type: ContactPropertyType, text: string): string | number | boolean {
  switch (type) {
    case "number": {
      const number = Number(text);
      return Number.isFinite(number) && text !== "" ? number : text;
    }
    case "boolean": {
      const lower = text.toLowerCase();
      if (["true", "yes", "1"].includes(lower)) return true;
      if (["false", "no", "0"].includes(lower)) return false;
      return text;
    }
    default:
      return text;
  }
}

/** `subscribed`/`unsubscribed` (also `true`/`false`, `yes`/`no`); anything else is `undefined`. */
function statusValue(text: string): "subscribed" | "unsubscribed" | undefined {
  const lower = text.toLowerCase();
  if (["subscribed", "true", "yes", "1"].includes(lower)) return "subscribed";
  if (["unsubscribed", "false", "no", "0"].includes(lower)) return "unsubscribed";
  return undefined;
}

/**
 * The entries of a contact CSV, unvalidated (the import reports bad rows), and the header
 * columns it ignored. Blank lines are skipped and empty cells left out. `properties` are the
 * environment's custom properties by key (values are converted to their type). Throws if a
 * header row lacks an email column.
 */
export function parseContactCsv(
  text: string,
  properties: ReadonlyMap<string, ContactPropertyType>,
): { entries: ContactCsvEntry[]; ignoredColumns: string[] } {
  const records = csvRecords(text).filter((record) =>
    record.fields.some((field) => field.trim() !== ""),
  );
  const first = records[0];
  if (!first) return { entries: [], ignoredColumns: [] };
  const names = first.fields.map(normalizeHeader);
  // A first row that doesn't start with an address is a header (and must name the email column).
  const hasHeader = emailAddressProblem(unguard(first.fields[0] ?? "")) !== null;
  if (!hasHeader) {
    return {
      entries: records.map((record) => ({
        line: record.line,
        entry: { email: unguard(record.fields[0] ?? "") },
      })),
      ignoredColumns: [],
    };
  }
  const columns = names.map((name) => {
    if (ADDRESS_HEADERS.has(name) || ADDRESS_HEADERS.has(name.replace("_", " "))) return "email";
    if (FIRST_NAME_HEADERS.has(name)) return "first_name";
    if (LAST_NAME_HEADERS.has(name)) return "last_name";
    if (STATUS_HEADERS.has(name)) return "status";
    if (properties.has(name)) return `property:${name}`;
    return IGNORED_HEADERS.has(name) ? "skip" : null;
  });
  if (!columns.includes("email")) {
    throw new Error('The header row needs an "email" column.');
  }
  const ignoredColumns = first.fields
    .filter((_, index) => columns[index] === null)
    .map((field) => field.trim());
  const entries = records.slice(1).map((record) => {
    const entry: ContactImportEntryInput = { email: "" };
    const values: Record<string, string | number | boolean> = {};
    columns.forEach((column, index) => {
      const raw = record.fields[index] ?? "";
      const key = column?.startsWith("property:") ? column.slice("property:".length) : null;
      // A string property keeps its spaces (exports write them as they are); the rest is trimmed.
      const text = key && properties.get(key) === "string" ? unguardExact(raw) : unguard(raw);
      if (column === null || column === "skip" || text === "") return;
      if (column === "email") entry.email = text;
      else if (column === "first_name") entry.first_name = text;
      else if (column === "last_name") entry.last_name = text;
      else if (column === "status") {
        // An unknown status (an export's `pending`, another tool's `cleaned`) is passed on, so
        // the import reports the row: left out, it would import the contact as subscribed.
        entry.status = (statusValue(text) ?? text) as ContactImportEntryInput["status"];
      } else if (key) {
        values[key] = propertyValue(properties.get(key) as ContactPropertyType, text);
      }
    });
    if (Object.keys(values).length > 0) entry.properties = values;
    return { line: record.line, entry };
  });
  return { entries, ignoredColumns };
}
