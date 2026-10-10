/**
 * CSV for suppression lists. Exports have a header row and can be imported again unchanged;
 * imports also accept other providers' exports (an `email` column) and header-less files whose
 * first column is the address and optional second column the scope.
 */
import { emailAddressProblem, type SuppressionOutput } from "./schemas.ts";

export const SUPPRESSION_CSV_COLUMNS = [
  "address",
  "scope",
  "reason",
  "created_at",
  "email_id",
  "id",
] as const;

/** Guard formula starts and escape literal apostrophes so the prefix is reversible. */
const GUARDED_START = /^['=+\-@\t\r]/;

function csvField(value: string): string {
  const safe = GUARDED_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function suppressionCsvHeader(): string {
  return `${SUPPRESSION_CSV_COLUMNS.join(",")}\r\n`;
}

export function suppressionCsvRow(suppression: SuppressionOutput): string {
  return `${SUPPRESSION_CSV_COLUMNS.map((column) => csvField(suppression[column] ?? "")).join(",")}\r\n`;
}

const BOM = String.fromCharCode(0xfeff);

/** RFC 4180 records with the 1-based line each starts on. Tolerates a BOM and bare `\n`. */
function csvRecords(text: string): { line: number; fields: string[] }[] {
  const input = text.startsWith(BOM) ? text.slice(1) : text;
  const records: { line: number; fields: string[] }[] = [];
  let fields: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        if (char === "\n") line++;
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      fields.push(field);
      records.push({ line: recordLine, fields });
      fields = [];
      field = "";
      line++;
      recordLine = line;
    } else {
      field += char;
    }
  }
  if (field !== "" || fields.length > 0) {
    fields.push(field);
    records.push({ line: recordLine, fields });
  }
  return records;
}

const ADDRESS_HEADERS = new Set(["address", "email", "email_address", "email address"]);
const SCOPE_HEADERS = new Set(["scope", "category"]);

export type SuppressionCsvEntry = { line: number; address: string; scope?: string };

/** Undoes one export guard, including the escape for a literal leading apostrophe. */
function unguard(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("'") && GUARDED_START.test(trimmed.slice(1))
    ? trimmed.slice(1)
    : trimmed;
}

/**
 * The entries of a suppression CSV, unvalidated (the import reports bad addresses and scopes).
 * Blank lines are skipped; an empty scope means `*`. Throws if a header row lacks an address
 * column.
 */
export function parseSuppressionCsv(text: string): SuppressionCsvEntry[] {
  const records = csvRecords(text).filter((record) =>
    record.fields.some((field) => field.trim() !== ""),
  );
  const first = records[0];
  if (!first) return [];
  const names = first.fields.map((field) => field.trim().toLowerCase());
  const addressFirst = emailAddressProblem(unguard(first.fields[0] ?? "")) === null;
  const hasHeader =
    !addressFirst && names.some((name) => ADDRESS_HEADERS.has(name) || SCOPE_HEADERS.has(name));
  let addressColumn = 0;
  let scopeColumn = 1;
  if (hasHeader) {
    addressColumn = names.findIndex((name) => ADDRESS_HEADERS.has(name));
    scopeColumn = names.findIndex((name) => SCOPE_HEADERS.has(name));
    if (addressColumn === -1) {
      throw new Error('The header row needs an "address" (or "email") column.');
    }
  }
  return records.slice(hasHeader ? 1 : 0).map((record) => {
    const scope = scopeColumn === -1 ? "" : unguard(record.fields[scopeColumn] ?? "");
    return {
      line: record.line,
      address: unguard(record.fields[addressColumn] ?? ""),
      ...(scope ? { scope } : {}),
    };
  });
}
