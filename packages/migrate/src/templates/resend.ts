/**
 * Resend templates: `{{{KEY}}}` (or `{{{KEY|fallback}}}`) replaced with declared variables, typed
 * `string` or `number`, with an optional fallback. A variable without a fallback is required.
 */
import { convertTemplate, Registry, type SourceNode } from "./convert.ts";
import type { ConvertedTemplate } from "./types.ts";

export type ResendTemplateVariable = {
  key: string;
  type: "string" | "number";
  fallback_value?: string | number | null | undefined;
};

export type ResendTemplateInput = {
  subject: string | null;
  html: string | null;
  text: string | null;
  variables: ResendTemplateVariable[];
};

const UNSUBSCRIBE_KEYS = new Set(["UNSUBSCRIBE_URL", "RESEND_UNSUBSCRIBE_URL"]);
/** Filled in from the contact on Resend's broadcasts; a coss.com send passes them. */
const CONTACT_KEYS = new Set(["FIRST_NAME", "LAST_NAME", "EMAIL"]);

function parse(source: string, notes: { message: string; lossy: boolean }[]): SourceNode[] {
  const nodes: SourceNode[] = [];
  let last = 0;
  for (const match of source.matchAll(/\{\{\{([^{}]*)\}\}\}|\{\{([^{}]*)\}\}/g)) {
    if (match.index > last) nodes.push({ kind: "text", value: source.slice(last, match.index) });
    last = match.index + match[0].length;
    const raw = match[1] !== undefined;
    const body = (match[1] ?? match[2] ?? "").trim();
    const bar = body.indexOf("|");
    const key = (bar === -1 ? body : body.slice(0, bar)).trim();
    const fallback = bar === -1 ? undefined : body.slice(bar + 1).trim();
    if (UNSUBSCRIBE_KEYS.has(key)) {
      nodes.push({ kind: "placeholder", name: "unsubscribe_url", link: false, source: match[0] });
      continue;
    }
    if (!/^[A-Za-z0-9_.-]+$/.test(key)) {
      nodes.push({ kind: "verbatim", source: match[0], message: `"${body}".` });
      continue;
    }
    if (CONTACT_KEYS.has(key)) {
      notes.push({
        message: `{{{${key}}}} came from the contact in Resend: pass it when sending.`,
        lossy: false,
      });
    }
    nodes.push({
      kind: "var",
      path: { segments: key.split("."), up: 0, root: false },
      raw,
      fallback,
      source: match[0],
    });
  }
  if (last < source.length) nodes.push({ kind: "text", value: source.slice(last) });
  return nodes;
}

export function convertResendTemplate(input: ResendTemplateInput): ConvertedTemplate {
  const notes: { message: string; lossy: boolean }[] = [];
  const registry = new Registry(null);
  // Every declared variable, used or not: sends name them all, and unknown names are refused.
  for (const variable of input.variables) {
    if (UNSUBSCRIBE_KEYS.has(variable.key)) continue;
    const fallback = variable.fallback_value;
    registry.declare(variable.key, {
      type: variable.type,
      fallback: fallback === null || fallback === undefined ? undefined : String(fallback),
      required: fallback === null || fallback === undefined,
    });
  }
  const field = (source: string | null) =>
    source === null || source === "" ? null : parse(source, notes);
  return convertTemplate({
    subject: field(input.subject),
    html: field(input.html),
    text: field(input.text),
    registry,
    dialect: { walksUp: false },
    notes: [...new Map(notes.map((note) => [note.message, note])).values()],
  });
}
