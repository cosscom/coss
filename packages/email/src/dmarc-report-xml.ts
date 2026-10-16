/**
 * DMARC aggregate reports as mailbox providers send them (RFC 7489 appendix C, and RFC 9990's
 * namespaced `dmarc-2.0` format): an XML document, usually gzip'ed or zipped, attached to an
 * email. Pure: unpacking with size limits (`node:zlib`), a small XML reader that never resolves
 * entities or DTDs (a report needs neither, and both are how XML parsers get attacked), and the
 * mapping to `DmarcAggregateReport`.
 */
import { gunzipSync, inflateRawSync } from "node:zlib";

/** Unpacked reports above this are refused (a zip/gzip bomb guard; real reports are far smaller). */
export const MAX_DMARC_REPORT_BYTES = 20 * 1024 * 1024;
/** Records kept per report; the rest is dropped and the report marked `truncated`. */
export const MAX_DMARC_REPORT_RECORDS = 10_000;
const MAX_XML_DEPTH = 32;
const MAX_XML_ELEMENTS = 400_000;

export class DmarcReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DmarcReportError";
  }
}

export type DmarcDisposition = "none" | "quarantine" | "reject";
export type DmarcAlignedResult = "pass" | "fail";

export type DmarcAggregateRecord = {
  sourceIp: string;
  count: number;
  disposition: DmarcDisposition;
  dkim: DmarcAlignedResult;
  spf: DmarcAlignedResult;
  reasons: { type: string; comment: string | null }[];
  headerFrom: string;
  envelopeFrom: string | null;
  authResults: {
    dkim: { domain: string; selector: string | null; result: string }[];
    spf: { domain: string; scope: string | null; result: string }[];
  };
};

export type DmarcAggregateReport = {
  reporterOrg: string;
  reporterEmail: string | null;
  reportId: string;
  periodBegin: Date;
  periodEnd: Date;
  policyPublished: {
    domain: string;
    p: string | null;
    sp: string | null;
    np: string | null;
    adkim: string | null;
    aspf: string | null;
    pct: number | null;
    testing: string | null;
  };
  records: DmarcAggregateRecord[];
  truncated: boolean;
};

// --- Unpacking ---------------------------------------------------------------------------------

function isGzip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x1f && bytes[1] === 0x8b;
}

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function bounded<T>(unpack: () => T): T {
  try {
    return unpack();
  } catch (error) {
    if (
      (error as { code?: string }).code === "ERR_BUFFER_TOO_LARGE" ||
      error instanceof RangeError
    ) {
      throw new DmarcReportError("The report is too large once unpacked.");
    }
    throw new DmarcReportError("The report could not be unpacked.");
  }
}

/**
 * The first `.xml` entry of a zip archive, inflated with a size limit. Sizes come from the central
 * directory (entries written with a data descriptor leave them out of the local header).
 */
function unzipFirstXml(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End of central directory: 22 bytes plus a comment of up to 64 KB, at the very end.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new DmarcReportError("The zip archive is malformed.");
  const entries = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  for (let n = 0; n < entries; n++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (!name.toLowerCase().endsWith(".xml")) continue;
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new DmarcReportError("The zip archive is malformed.");
    }
    const start =
      localOffset +
      30 +
      view.getUint16(localOffset + 26, true) +
      view.getUint16(localOffset + 28, true);
    const data = bytes.subarray(start, start + compressedSize);
    if (method === 0) {
      if (data.byteLength > MAX_DMARC_REPORT_BYTES) {
        throw new DmarcReportError("The report is too large once unpacked.");
      }
      return data;
    }
    if (method === 8) {
      return bounded(() => inflateRawSync(data, { maxOutputLength: MAX_DMARC_REPORT_BYTES }));
    }
    throw new DmarcReportError("The zip archive uses an unsupported compression method.");
  }
  throw new DmarcReportError("The zip archive holds no XML report.");
}

/**
 * The report's XML from an attachment: gzip, zip or plain XML, told apart by content (reporters
 * label them inconsistently). `null` when the bytes are none of these.
 */
export function unpackDmarcReport(content: Uint8Array): string | null {
  let xml: Uint8Array;
  if (isGzip(content)) {
    xml = bounded(() => gunzipSync(content, { maxOutputLength: MAX_DMARC_REPORT_BYTES }));
  } else if (isZip(content)) {
    xml = unzipFirstXml(content);
  } else {
    if (content.byteLength > MAX_DMARC_REPORT_BYTES) return null;
    xml = content;
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(xml).replace(/^﻿/, "");
  return /^\s*</.test(text) && /<(\w+:)?feedback[\s>]/.test(text) ? text : null;
}

// --- A minimal XML reader -----------------------------------------------------------------------

export type XmlElement = { name: string; children: XmlElement[]; text: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Characters XML 1.0 allows (`Char`); others (NUL above all, which PostgreSQL can't store) aren't. */
function isXmlChar(code: number): boolean {
  return (
    code === 0x9 ||
    code === 0xa ||
    code === 0xd ||
    (code >= 0x20 && code <= 0xd7ff) ||
    (code >= 0xe000 && code <= 0xfffd) ||
    (code >= 0x10000 && code <= 0x10ffff)
  );
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point.
const FORBIDDEN_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/;

function decodeText(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      if (!Number.isFinite(code) || !isXmlChar(code)) {
        throw new DmarcReportError(
          "The report is not valid XML: a character reference XML forbids.",
        );
      }
      return String.fromCodePoint(code);
    }
    return ENTITIES[entity] ?? match;
  });
}

/**
 * Reads an XML document into elements (names without namespace prefixes, attributes ignored).
 * Refuses DOCTYPEs: a report never has one, and nothing here would honor it.
 */
export function parseXml(input: string): XmlElement {
  const root: XmlElement = { name: "", children: [], text: "" };
  const stack: XmlElement[] = [root];
  let elements = 0;
  let i = 0;
  const fail = (message: string): never => {
    throw new DmarcReportError(`The report is not valid XML: ${message}`);
  };
  if (FORBIDDEN_CHARS.test(input)) fail("a character XML forbids");
  while (i < input.length) {
    const lt = input.indexOf("<", i);
    const top = stack[stack.length - 1] as XmlElement;
    if (lt < 0) {
      top.text += decodeText(input.slice(i));
      break;
    }
    if (lt > i) top.text += decodeText(input.slice(i, lt));
    if (input.startsWith("<?", lt)) {
      const end = input.indexOf("?>", lt);
      if (end < 0) fail("unterminated declaration");
      i = end + 2;
    } else if (input.startsWith("<!--", lt)) {
      const end = input.indexOf("-->", lt);
      if (end < 0) fail("unterminated comment");
      i = end + 3;
    } else if (input.startsWith("<![CDATA[", lt)) {
      const end = input.indexOf("]]>", lt);
      if (end < 0) fail("unterminated CDATA section");
      top.text += input.slice(lt + 9, end);
      i = end + 3;
    } else if (input.startsWith("<!", lt)) {
      fail("document type declarations are not allowed");
    } else if (input.startsWith("</", lt)) {
      const end = input.indexOf(">", lt);
      if (end < 0) fail("unterminated end tag");
      const name = input
        .slice(lt + 2, end)
        .trim()
        .replace(/^[\w.-]+:/, "");
      if (stack.length < 2 || top.name !== name) fail(`unexpected </${name}>`);
      stack.pop();
      i = end + 1;
    } else {
      // A start tag: find its end outside quoted attribute values.
      let end = lt + 1;
      let quote: string | null = null;
      for (; end < input.length; end++) {
        const char = input[end];
        if (quote) {
          if (char === quote) quote = null;
        } else if (char === '"' || char === "'") quote = char;
        else if (char === ">") break;
      }
      if (end >= input.length) fail("unterminated start tag");
      const selfClosing = input[end - 1] === "/";
      const body = input.slice(lt + 1, selfClosing ? end - 1 : end);
      const name = (body.match(/^\s*([^\s/>]+)/)?.[1] ?? "").replace(/^[\w.-]+:/, "");
      if (!name) fail("empty tag name");
      if (++elements > MAX_XML_ELEMENTS) fail("too many elements");
      if (stack.length > MAX_XML_DEPTH) fail("nested too deeply");
      const element: XmlElement = { name, children: [], text: "" };
      top.children.push(element);
      if (!selfClosing) stack.push(element);
      i = end + 1;
    }
  }
  if (stack.length !== 1) fail("unclosed elements");
  const [document] = root.children;
  if (!document || root.children.length !== 1) fail("expected one root element");
  return document as XmlElement;
}

// --- Mapping ------------------------------------------------------------------------------------

function child(element: XmlElement | undefined, name: string): XmlElement | undefined {
  return element?.children.find((c) => c.name === name);
}

function children(element: XmlElement | undefined, name: string): XmlElement[] {
  return element?.children.filter((c) => c.name === name) ?? [];
}

function textOf(element: XmlElement | undefined, name: string, max = 255): string | null {
  const value = child(element, name)?.text.trim();
  return value ? value.slice(0, max) : null;
}

function required(element: XmlElement | undefined, name: string, max = 255): string {
  const value = textOf(element, name, max);
  if (!value) throw new DmarcReportError(`The report has no <${name}>.`);
  return value;
}

function lowerOrNull(value: string | null): string | null {
  return value ? value.toLowerCase() : null;
}

function dispositionOf(value: string | null): DmarcDisposition {
  const lower = value?.toLowerCase();
  // RFC 9990 adds `pass` (nothing applied because DMARC passed).
  return lower === "quarantine" || lower === "reject" ? lower : "none";
}

function alignedOf(value: string | null): DmarcAlignedResult {
  return value?.toLowerCase() === "pass" ? "pass" : "fail";
}

function timestampOf(element: XmlElement | undefined, name: string): Date {
  const value = required(element, name);
  if (!/^\d{1,12}$/.test(value)) throw new DmarcReportError(`<${name}> is not a timestamp.`);
  return new Date(Number(value) * 1000);
}

function recordOf(element: XmlElement): DmarcAggregateRecord {
  const row = child(element, "row");
  const evaluated = child(row, "policy_evaluated");
  const identifiers = child(element, "identifiers");
  const auth = child(element, "auth_results");
  const count = Number(required(row, "count"));
  if (!Number.isSafeInteger(count) || count < 0 || count > 2 ** 31 - 1) {
    throw new DmarcReportError("A record has an invalid <count>.");
  }
  return {
    sourceIp: required(row, "source_ip", 64).toLowerCase(),
    count,
    disposition: dispositionOf(textOf(evaluated, "disposition")),
    dkim: alignedOf(textOf(evaluated, "dkim")),
    spf: alignedOf(textOf(evaluated, "spf")),
    reasons: children(evaluated, "reason")
      .slice(0, 10)
      .map((reason) => ({
        type: textOf(reason, "type", 64)?.toLowerCase() ?? "other",
        comment: textOf(reason, "comment", 500),
      })),
    headerFrom: required(identifiers, "header_from").toLowerCase(),
    envelopeFrom: lowerOrNull(textOf(identifiers, "envelope_from")),
    authResults: {
      dkim: children(auth, "dkim")
        .slice(0, 10)
        .map((dkim) => ({
          domain: (textOf(dkim, "domain") ?? "").toLowerCase(),
          selector: lowerOrNull(textOf(dkim, "selector")),
          result: (textOf(dkim, "result", 32) ?? "none").toLowerCase(),
        })),
      spf: children(auth, "spf")
        .slice(0, 10)
        .map((spf) => ({
          domain: (textOf(spf, "domain") ?? "").toLowerCase(),
          scope: lowerOrNull(textOf(spf, "scope", 32)),
          result: (textOf(spf, "result", 32) ?? "none").toLowerCase(),
        })),
    },
  };
}

/** Maps a report's XML to a `DmarcAggregateReport`, or throws `DmarcReportError`. */
export function parseDmarcAggregateReport(xml: string): DmarcAggregateReport {
  const feedback = parseXml(xml);
  if (feedback.name !== "feedback") throw new DmarcReportError("The report has no <feedback>.");
  const metadata = child(feedback, "report_metadata");
  const range = child(metadata, "date_range");
  const policy = child(feedback, "policy_published");
  const pct = textOf(policy, "pct");
  const recordElements = children(feedback, "record");
  return {
    reporterOrg: required(metadata, "org_name"),
    reporterEmail: textOf(metadata, "email"),
    reportId: required(metadata, "report_id"),
    periodBegin: timestampOf(range, "begin"),
    periodEnd: timestampOf(range, "end"),
    policyPublished: {
      domain: required(policy, "domain").toLowerCase().replace(/\.$/, ""),
      p: lowerOrNull(textOf(policy, "p", 32)),
      sp: lowerOrNull(textOf(policy, "sp", 32)),
      np: lowerOrNull(textOf(policy, "np", 32)),
      adkim: lowerOrNull(textOf(policy, "adkim", 8)),
      aspf: lowerOrNull(textOf(policy, "aspf", 8)),
      pct: pct && /^\d{1,3}$/.test(pct) && Number(pct) <= 100 ? Number(pct) : null,
      testing: lowerOrNull(textOf(policy, "testing", 8)),
    },
    records: recordElements.slice(0, MAX_DMARC_REPORT_RECORDS).map(recordOf),
    truncated: recordElements.length > MAX_DMARC_REPORT_RECORDS,
  };
}
