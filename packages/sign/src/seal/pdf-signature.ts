/**
 * Puts a seal into a PDF: an invisible signature field whose value is a signature dictionary
 * (`/SubFilter /ETSI.CAdES.detached`, PAdES) with a zero-filled `/Contents` placeholder. The file
 * is saved once without object streams, the placeholder's byte ranges are written in, everything
 * but the placeholder is hashed, and the CMS goes into the placeholder, so a viewer can tell the
 * whole file is unchanged since.
 */
import { PDFArray, type PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString } from "pdf-lib";
import { cadesSignature } from "./cms.ts";
import { asn1js, sha256, toArrayBuffer } from "./crypto.ts";
import type { Sealer } from "./sealer.ts";
import type { TimestampAuthority } from "./tsa.ts";

/** Bytes reserved for the CMS: the chain, a timestamp token with its own chain, and room to spare. */
export const SIGNATURE_PLACEHOLDER_BYTES = 32 * 1024;
const BYTE_RANGE_PLACEHOLDER = "**********";

export type SealOptions = {
  sealer: Sealer;
  tsa?: TimestampAuthority | null;
  /** `/Name`, `/Reason`, `/Location`, `/ContactInfo` of the signature dictionary. */
  name: string;
  reason: string;
  location?: string;
  contactInfo?: string;
  signedAt: Date;
};

/** Seals `document` (which this saves): returns the sealed file's bytes. */
export async function sealPdf(document: PDFDocument, opts: SealOptions): Promise<Uint8Array> {
  const { context } = document;
  const placeholder = PDFName.of(BYTE_RANGE_PLACEHOLDER);
  const signature = context.obj({
    Type: "Sig",
    Filter: "Adobe.PPKLite",
    SubFilter: "ETSI.CAdES.detached",
    ByteRange: PDFArray.withContext(context),
    Contents: PDFHexString.of("0".repeat(SIGNATURE_PLACEHOLDER_BYTES * 2)),
    // Text as hex strings: PDFString writes its value as is, so a "(" or "\\" in it would break
    // the dictionary.
    Name: PDFHexString.fromText(opts.name),
    Reason: PDFHexString.fromText(opts.reason),
    M: PDFString.fromDate(opts.signedAt),
    ...(opts.location ? { Location: PDFHexString.fromText(opts.location) } : {}),
    ...(opts.contactInfo ? { ContactInfo: PDFHexString.fromText(opts.contactInfo) } : {}),
  });
  const byteRange = signature.get(PDFName.of("ByteRange")) as PDFArray;
  byteRange.push(PDFNumber.of(0));
  byteRange.push(placeholder);
  byteRange.push(placeholder);
  byteRange.push(placeholder);
  const signatureRef = context.register(signature);

  const pages = document.getPages();
  const page = pages[pages.length - 1];
  if (!page) throw new Error("A PDF to seal needs a page.");
  const widget = context.obj({
    Type: "Annot",
    Subtype: "Widget",
    FT: "Sig",
    Rect: [0, 0, 0, 0],
    V: signatureRef,
    T: PDFString.of("coss.com seal"),
    // Print + Locked: invisible, and not to be changed.
    F: 132,
    P: page.ref,
  });
  const widgetRef = context.register(widget);
  const annotations = page.node.Annots();
  if (annotations) annotations.push(widgetRef);
  else page.node.set(PDFName.of("Annots"), context.obj([widgetRef]));
  document.catalog.set(PDFName.of("AcroForm"), context.obj({ Fields: [widgetRef], SigFlags: 3 }));

  const bytes = await document.save({ useObjectStreams: false });
  const text = Buffer.from(bytes).toString("latin1");
  const rangeText = `[ 0 /${BYTE_RANGE_PLACEHOLDER} /${BYTE_RANGE_PLACEHOLDER} /${BYTE_RANGE_PLACEHOLDER} ]`;
  const rangeAt = text.indexOf(rangeText);
  const contentsText = `<${"0".repeat(SIGNATURE_PLACEHOLDER_BYTES * 2)}>`;
  const contentsAt = text.indexOf(contentsText);
  if (rangeAt < 0 || contentsAt < 0 || text.indexOf(rangeText, rangeAt + 1) >= 0) {
    throw new Error("The signature placeholder wasn't found exactly once.");
  }
  const contentsEnd = contentsAt + contentsText.length;
  const ranges = [0, contentsAt, contentsEnd, bytes.length - contentsEnd];
  const written = `[${ranges.join(" ")}]`;
  if (written.length > rangeText.length) throw new Error("The byte ranges don't fit.");
  const sealed = Buffer.from(bytes);
  sealed.write(written.padEnd(rangeText.length, " "), rangeAt, "latin1");

  const signed = Buffer.concat([sealed.subarray(0, contentsAt), sealed.subarray(contentsEnd)]);
  const cms = await cadesSignature({
    contentDigest: await sha256(signed),
    sealer: opts.sealer,
    tsa: opts.tsa,
  });
  if (cms.length > SIGNATURE_PLACEHOLDER_BYTES) {
    throw new Error(`The seal's CMS (${cms.length} bytes) doesn't fit its placeholder.`);
  }
  const hex = Buffer.from(cms)
    .toString("hex")
    .padEnd(SIGNATURE_PLACEHOLDER_BYTES * 2, "0");
  sealed.write(hex, contentsAt + 1, "latin1");
  return new Uint8Array(sealed);
}

/** The sealed file's byte ranges and CMS (for checks and tests). */
export function readPdfSeal(bytes: Uint8Array): {
  byteRange: [number, number, number, number];
  signedBytes: Uint8Array;
  cms: Uint8Array;
} {
  const text = Buffer.from(bytes).toString("latin1");
  const match = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(text);
  if (!match) throw new Error("No seal in this PDF.");
  const byteRange = match.slice(1, 5).map(Number) as [number, number, number, number];
  const [start, length, next, rest] = byteRange;
  const buffer = Buffer.from(bytes);
  const signedBytes = Buffer.concat([
    buffer.subarray(start, start + length),
    buffer.subarray(next, next + rest),
  ]);
  const padded = Buffer.from(buffer.toString("latin1", start + length + 1, next - 1), "hex");
  // The CMS is DER: its own length says where the zero padding starts.
  const parsed = asn1js.fromBER(toArrayBuffer(new Uint8Array(padded)));
  if (parsed.offset <= 0) throw new Error("The seal's CMS can't be read.");
  const cms = padded.subarray(0, parsed.offset);
  return { byteRange, signedBytes: new Uint8Array(signedBytes), cms: new Uint8Array(cms) };
}
