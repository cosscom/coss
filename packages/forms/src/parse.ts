/**
 * A posted form, read: data fields apart from controls (`_next`, the honeypot, captcha and device
 * tokens), checked against the form's definitions and caps, with uploaded files checked against
 * its upload settings. Pure: nothing is stored here.
 */
import type { FormFieldDefinition } from "@coss/db/schema";
import { type FormRow, filesOf } from "./forms.ts";
import {
  BLOCKED_FORM_FILE_TYPES,
  DEFAULT_FORM_FILE_TYPES,
  MAX_SUBMISSION_FIELDS,
  MAX_SUBMISSION_FILE_BYTES,
  MAX_SUBMISSION_TEXT_BYTES,
  MAX_SUBMISSION_VALUE_LENGTH,
  MAX_SUBMISSION_VALUES,
} from "./schemas.ts";

export type SubmittedFile = {
  field: string;
  filename: string;
  contentType: string;
  content: Uint8Array;
};

export type FieldErrorCode =
  | "required"
  | "invalid"
  | "too_long"
  | "unknown_field"
  | "too_many_fields"
  | "too_large"
  | "file_type"
  | "too_many_files"
  | "files_not_accepted"
  | "captcha";

/** A problem with what was submitted, shown to the submitter. */
export type FieldError = { field: string | null; code: FieldErrorCode; message: string };

export type ParsedSubmission = {
  data: Record<string, string | string[]>;
  submitterEmail: string | null;
  files: SubmittedFile[];
  honeypot: boolean;
  next: string | null;
  deviceToken: string | null;
  captchaToken: string | null;
  errors: FieldError[];
};

const CAPTCHA_FIELDS = ["cf-turnstile-response", "h-captcha-response"];
const EMAIL_PATTERN = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]+$/;
const TEL_PATTERN = /^[+()\d\s.-]{3,32}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
const MAX_NAME_LENGTH = 64;
const MAX_FILENAME_LENGTH = 200;
/** Extensions refused whatever type the browser claims: they run in a browser or a shell. */
const BLOCKED_EXTENSIONS =
  /\.(html?|xhtml|svgz?|js|mjs|exe|msi|bat|cmd|com|scr|ps1|sh|app|dmg|jar|vbs)$/i;

export function isEmailAddress(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

function labelOf(field: FormFieldDefinition): string {
  return field.label ?? field.name;
}

/** Keeps the file's own name only: no path, no control characters, at most 200 characters. */
export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\p{Cc}\p{Cf}"]/gu, "").trim();
  return (clean || "file").slice(-MAX_FILENAME_LENGTH);
}

function typeAllowed(contentType: string, allowed: readonly string[]): boolean {
  return allowed.some((pattern) =>
    pattern.endsWith("/*") ? contentType.startsWith(pattern.slice(0, -1)) : contentType === pattern,
  );
}

function checkValue(field: FormFieldDefinition, values: string[], errors: FieldError[]): void {
  const label = labelOf(field);
  const add = (code: FieldErrorCode, message: string) =>
    errors.push({ field: field.name, code, message });
  // Every value, blank or not: spaces count against the field's `max_length` too.
  if (field.maxLength !== null && values.some((value) => value.length > (field.maxLength ?? 0))) {
    add("too_long", `${label} must be at most ${field.maxLength} characters.`);
    return;
  }
  const filled = values.filter((value) => value.trim() !== "");
  if (filled.length === 0) {
    if (field.required) add("required", `${label} is required.`);
    return;
  }
  if (field.type !== "checkbox" && filled.length > 1) {
    add("invalid", `${label} takes one value.`);
    return;
  }
  for (const value of filled) {
    if (field.maxLength !== null && value.length > field.maxLength) {
      add("too_long", `${label} must be at most ${field.maxLength} characters.`);
      return;
    }
    const trimmed = value.trim();
    switch (field.type) {
      case "email":
        if (!isEmailAddress(trimmed)) add("invalid", `${label} must be an email address.`);
        break;
      case "number":
        if (!Number.isFinite(Number(trimmed))) add("invalid", `${label} must be a number.`);
        break;
      case "url":
        try {
          const url = new URL(trimmed);
          if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
        } catch {
          add("invalid", `${label} must be a link (https://…).`);
        }
        break;
      case "date":
        // A real day: `Date.parse` rolls 2026-02-31 over into March.
        if (!DATE_PATTERN.test(trimmed) || !isCalendarDate(trimmed)) {
          add("invalid", `${label} must be a date (YYYY-MM-DD).`);
        }
        break;
      case "tel":
        if (!TEL_PATTERN.test(trimmed)) add("invalid", `${label} must be a phone number.`);
        break;
      case "select":
      case "radio":
        if (!field.options.includes(value)) add("invalid", `${label} must be one of the choices.`);
        break;
      case "checkbox":
        if (field.options.length > 0 && !field.options.includes(value)) {
          add("invalid", `${label} must be one of the choices.`);
        }
        break;
      default:
        break;
    }
  }
}

/**
 * Reads what was posted. `fields` are name/value pairs in order (a name posted twice becomes an
 * array); `files` the uploaded parts.
 */
export function parseSubmission(
  form: Pick<FormRow, "fields" | "strictFields" | "honeypotField" | "emailField" | "files">,
  fields: readonly [string, string][],
  files: readonly SubmittedFile[],
): ParsedSubmission {
  const errors: FieldError[] = [];
  const values = new Map<string, string[]>();
  let honeypot = false;
  let next: string | null = null;
  let deviceToken: string | null = null;
  let captchaToken: string | null = null;
  let valueCount = 0;
  for (const [name, value] of fields) {
    if (name === form.honeypotField) {
      if (value.trim() !== "") honeypot = true;
      continue;
    }
    if (CAPTCHA_FIELDS.includes(name)) {
      if (value) captchaToken = value.slice(0, 4096);
      continue;
    }
    if (name === "_next") next = value;
    else if (name === "_coss_device") deviceToken = value.slice(0, 4096);
    // Every other `_` name is a control of some other form tool: never data.
    if (name.startsWith("_") || name === "") continue;
    if (++valueCount > MAX_SUBMISSION_VALUES) continue;
    const key = name.slice(0, MAX_NAME_LENGTH);
    const list = values.get(key);
    if (list) list.push(value);
    else values.set(key, [value]);
  }

  const definitions = form.fields;
  const defined = new Map(definitions?.map((field) => [field.name, field]) ?? []);
  if (values.size > MAX_SUBMISSION_FIELDS) {
    errors.push({
      field: null,
      code: "too_many_fields",
      message: `At most ${MAX_SUBMISSION_FIELDS} fields.`,
    });
  }
  if (valueCount > MAX_SUBMISSION_VALUES) {
    errors.push({
      field: null,
      code: "too_many_fields",
      message: `At most ${MAX_SUBMISSION_VALUES} values.`,
    });
  }
  let textBytes = 0;
  const encoder = new TextEncoder();
  const entries: [string, string | string[]][] = [];
  for (const [name, list] of values) {
    const field = defined.get(name);
    if (definitions && form.strictFields && !field) {
      errors.push({
        field: name,
        code: "unknown_field",
        message: `${name} isn't a field of this form.`,
      });
      continue;
    }
    if (field?.type === "file") continue;
    for (const value of list) {
      textBytes += encoder.encode(value).byteLength;
      // Every value, defined field or not (a field's own `max_length`, never larger, is checked
      // with its type).
      if (value.length > MAX_SUBMISSION_VALUE_LENGTH && (!field || field.maxLength === null)) {
        errors.push({
          field: name,
          code: "too_long",
          message: `${name} must be at most ${MAX_SUBMISSION_VALUE_LENGTH} characters.`,
        });
        break;
      }
    }
    entries.push([name, list.length === 1 ? (list[0] ?? "") : list]);
  }
  // `fromEntries` makes a field named `__proto__` an own entry like any other.
  const data: Record<string, string | string[]> = Object.fromEntries(entries);
  if (textBytes > MAX_SUBMISSION_TEXT_BYTES) {
    errors.push({ field: null, code: "too_large", message: "The submission is too long." });
  }
  for (const field of definitions ?? []) {
    if (field.type === "file") continue;
    checkValue(field, values.get(field.name) ?? [], errors);
  }

  const emailValue = values.get(form.emailField)?.[0]?.trim() ?? "";
  let submitterEmail: string | null = null;
  if (emailValue !== "") {
    if (isEmailAddress(emailValue)) submitterEmail = emailValue.toLowerCase();
    else if (!errors.some((error) => error.field === form.emailField)) {
      errors.push({
        field: form.emailField,
        code: "invalid",
        message: "Enter a valid email address.",
      });
    }
  }

  const upload = filesOf(form);
  const accepted: SubmittedFile[] = [];
  const nonEmpty = files.filter((file) => file.content.byteLength > 0 || file.filename !== "");
  if (nonEmpty.length > 0 && !upload.enabled) {
    errors.push({
      field: nonEmpty[0]?.field ?? null,
      code: "files_not_accepted",
      message: "This form doesn't accept files.",
    });
  } else if (nonEmpty.length > upload.maxFiles) {
    errors.push({
      field: null,
      code: "too_many_files",
      message: `At most ${upload.maxFiles} files.`,
    });
  } else {
    const allowed = upload.allowedTypes.length > 0 ? upload.allowedTypes : DEFAULT_FORM_FILE_TYPES;
    let total = 0;
    for (const file of nonEmpty) {
      const field = defined.get(file.field);
      // A defined field that isn't a file never takes one; an undefined one only without
      // `strict_fields`, as for text.
      if (definitions && (field ? field.type !== "file" : form.strictFields)) {
        errors.push({
          field: file.field,
          code: "unknown_field",
          message: `${file.field} isn't a file field of this form.`,
        });
        continue;
      }
      const filename = safeFilename(file.filename);
      const contentType = file.contentType.split(";")[0]?.trim().toLowerCase() || "";
      if (
        !typeAllowed(contentType, allowed) ||
        (BLOCKED_FORM_FILE_TYPES as readonly string[]).includes(contentType) ||
        BLOCKED_EXTENSIONS.test(filename)
      ) {
        errors.push({
          field: file.field,
          code: "file_type",
          message: `${filename} isn't a type this form accepts.`,
        });
        continue;
      }
      if (file.content.byteLength > upload.maxFileBytes) {
        errors.push({
          field: file.field,
          code: "too_large",
          message: `${filename} is larger than ${Math.floor(upload.maxFileBytes / 1024 / 1024) || 1} MB.`,
        });
        continue;
      }
      total += file.content.byteLength;
      accepted.push({ ...file, filename, contentType });
    }
    if (total > MAX_SUBMISSION_FILE_BYTES) {
      errors.push({ field: null, code: "too_large", message: "The files are too large together." });
    }
  }
  for (const field of definitions ?? []) {
    if (field.type === "file" && field.required) {
      if (!accepted.some((file) => file.field === field.name)) {
        errors.push({
          field: field.name,
          code: "required",
          message: `${labelOf(field)} is required.`,
        });
      }
    }
  }

  return {
    data,
    submitterEmail,
    files: accepted,
    honeypot,
    next,
    deviceToken,
    captchaToken,
    errors,
  };
}

/** The submission as text for content screening: one `label: value` line per field. */
export function submissionText(
  form: Pick<FormRow, "fields">,
  data: Record<string, string | string[]>,
  maxChars: number,
): string {
  const labels = new Map(form.fields?.map((field) => [field.name, labelOf(field)]) ?? []);
  const lines = Object.entries(data).map(
    ([name, value]) =>
      `${labels.get(name) ?? name}: ${Array.isArray(value) ? value.join(", ") : value}`,
  );
  return lines.join("\n").slice(0, maxChars);
}
