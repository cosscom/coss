/**
 * The completed document: the request's PDFs one after another, each signer's field values drawn
 * onto their pages (signature images, text, check marks), then the certificate pages (who signed,
 * how they were identified, what they agreed to, the documents' hashes, the audit trail). Sealed
 * afterwards (`seal/pdf-signature.ts`), so none of it can change unnoticed.
 */
import { readFileSync } from "node:fs";
import type { SignEventDetails } from "@coss/db/schema";
import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";

const INK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.4, 0.42, 0.47);
const RULE = rgb(0.85, 0.86, 0.88);

export type CompletedField = {
  documentIndex: number;
  label?: string | null;
  type: "signature" | "initials" | "date_signed" | "name" | "email" | "text" | "checkbox";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | null;
  signerId: string;
};

export type CompletedSigner = {
  id: string;
  name: string;
  email: string;
  delivery: "embedded" | "email";
  authentication: "email_link" | "customer_asserted";
  clientRef: string | null;
  signedAt: Date;
  viewedAt: Date | null;
  consentedAt: Date | null;
  signature: Uint8Array;
  initials: Uint8Array | null;
};

export type CompletedEvent = {
  sequence: number;
  type: string;
  actor: string;
  signerId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: SignEventDetails;
  occurredAt: Date;
  hash: string;
};

export type CompletedRequest = {
  id: string;
  title: string;
  requester: string;
  sandbox: boolean;
  createdAt: Date;
  completedAt: Date;
  documents: { id: string; filename: string; sha256: string; bytes: Uint8Array }[];
  fields: CompletedField[];
  signers: CompletedSigner[];
  events: CompletedEvent[];
};

const fontPath = (file: string) => new URL(`../assets/${file}`, import.meta.url);
let fontBytes: { regular: Uint8Array; bold: Uint8Array; mono: Uint8Array } | undefined;

/** Cal Sans and Paper Mono (OFL, `assets/`): Unicode text the standard 14 fonts can't draw. */
function fonts() {
  fontBytes ??= {
    regular: readFileSync(fontPath("CalSans-Regular.ttf")),
    bold: readFileSync(fontPath("CalSans-SemiBold.ttf")),
    mono: readFileSync(fontPath("PaperMono-Regular.ttf")),
  };
  return fontBytes;
}

type Fonts = { regular: PDFFont; bold: PDFFont; mono: PDFFont };

async function embedFonts(document: PDFDocument): Promise<Fonts> {
  document.registerFontkit(fontkit);
  const bytes = fonts();
  return {
    regular: await document.embedFont(bytes.regular, { subset: true }),
    bold: await document.embedFont(bytes.bold, { subset: true }),
    mono: await document.embedFont(bytes.mono, { subset: true }),
  };
}

/** A font's glyphs only: characters it can't draw become "?" instead of failing the seal. */
function drawable(font: PDFFont, text: string): string {
  const supported = new Set(font.getCharacterSet());
  return [...text.replace(/[\r\n\t]+/g, " ")]
    .map((char) => (supported.has(char.codePointAt(0) ?? 0) ? char : "?"))
    .join("");
}

/**
 * Where a box given in points from the top left of the page **as displayed** (crop box, `/Rotate`)
 * starts in the page's own coordinates, and the rotation that draws upright in it. `(left,
 * bottom)` is the box's bottom-left corner as displayed.
 */
function placement(
  page: PDFPage,
  left: number,
  bottom: number,
): { x: number; y: number; rotate: number } {
  const crop = page.getCropBox();
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  switch (rotation) {
    case 90:
      return { x: crop.x + bottom, y: crop.y + left, rotate: 90 };
    case 180:
      return { x: crop.x + crop.width - left, y: crop.y + bottom, rotate: 180 };
    case 270:
      return { x: crop.x + crop.width - bottom, y: crop.y + crop.height - left, rotate: 270 };
    default:
      return { x: crop.x + left, y: crop.y + crop.height - bottom, rotate: 0 };
  }
}

function drawImageInBox(page: PDFPage, image: PDFImage, field: CompletedField): void {
  // Fit inside the box, keeping its proportions, centered.
  const scale = Math.min(field.width / image.width, field.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const left = field.x + (field.width - width) / 2;
  const bottom = field.y + (field.height + height) / 2;
  const at = placement(page, left, bottom);
  page.drawImage(image, { x: at.x, y: at.y, width, height, rotate: degrees(at.rotate) });
}

/** `value` broken into lines no wider than `width` at `size` (words longer than a line are cut). */
function wrap(font: PDFFont, value: string, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(/(?<=\s)/)) {
    if (font.widthOfTextAtSize(line + word, size) <= width) {
      line += word;
      continue;
    }
    if (line) lines.push(line.trimEnd());
    line = word;
    while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/**
 * A value inside its box: one line, shrunk to fit; else wrapped onto as many lines as the box
 * holds, the last one cut with "…". Nothing is drawn outside the box (the certificate has the
 * whole value).
 */
function drawTextInBox(page: PDFPage, font: PDFFont, text: string, field: CompletedField): void {
  const value = drawable(font, text);
  const width = field.width - 2;
  let size = Math.min(field.height * 0.7, 12);
  while (size > 5 && font.widthOfTextAtSize(value, size) > width) size -= 0.5;
  let lines = [value];
  if (font.widthOfTextAtSize(value, size) > width) {
    size = Math.max(4, Math.min(size, field.height * 0.7));
    const fit = Math.max(1, Math.floor(field.height / (size * 1.15)));
    lines = wrap(font, value, size, width);
    if (lines.length > fit) {
      lines = lines.slice(0, fit);
      let last = `${lines[fit - 1] ?? ""}…`;
      while (last.length > 1 && font.widthOfTextAtSize(last, size) > width) {
        last = `${last.slice(0, -2)}…`;
      }
      lines[fit - 1] = last;
    }
  }
  const lineHeight = size * 1.15;
  const top = field.y + (field.height - lineHeight * lines.length) / 2;
  for (const [index, line] of lines.entries()) {
    // Each baseline a little above its line's bottom.
    const bottom = top + lineHeight * (index + 1) - size * 0.25;
    const at = placement(page, field.x + 1, bottom);
    page.drawText(line, { x: at.x, y: at.y, size, font, color: INK, rotate: degrees(at.rotate) });
  }
}

function drawCheck(page: PDFPage, field: CompletedField): void {
  const inset = Math.min(field.width, field.height) * 0.2;
  const points = [
    [field.x + inset, field.y + field.height * 0.55],
    [field.x + field.width * 0.42, field.y + field.height - inset],
    [field.x + field.width - inset, field.y + inset],
  ] as const;
  const thickness = Math.max(1, Math.min(field.width, field.height) * 0.12);
  for (let index = 0; index < points.length - 1; index++) {
    const [fromX, fromY] = points[index] ?? [0, 0];
    const [toX, toY] = points[index + 1] ?? [0, 0];
    const start = placement(page, fromX, fromY);
    const end = placement(page, toX, toY);
    page.drawLine({
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      thickness,
      color: INK,
    });
  }
}

/** Interactive form fields would stay editable on top of what was signed: flatten them first. */
async function loadFlat(bytes: Uint8Array): Promise<PDFDocument> {
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  try {
    document.getForm().flatten();
  } catch (error) {
    console.error("[sign] couldn't flatten a document's form fields:", error);
  }
  return document;
}

function iso(date: Date | null): string {
  return date ? `${date.toISOString().replace("T", " ").slice(0, 19)} UTC` : "—";
}

/** A simple top-down layout on Letter pages, starting new ones as it runs out of room. */
class Writer {
  private page!: PDFPage;
  private y = 0;
  readonly margin = 54;
  readonly width = 612 - 108;

  constructor(
    private readonly document: PDFDocument,
    private readonly fonts: Fonts,
    private readonly footer: string,
  ) {
    this.newPage();
  }

  private newPage(): void {
    this.page = this.document.addPage([612, 792]);
    this.y = 792 - this.margin;
    const text = drawable(this.fonts.regular, this.footer);
    this.page.drawText(text, {
      x: this.margin,
      y: 30,
      size: 7.5,
      font: this.fonts.regular,
      color: MUTED,
    });
  }

  ensure(height: number): void {
    if (this.y - height < this.margin) this.newPage();
  }

  gap(points: number): void {
    this.y -= points;
  }

  /** Wrapped text; `mono` for hashes and ids. */
  text(
    value: string,
    opts: {
      size?: number;
      bold?: boolean;
      mono?: boolean;
      color?: typeof INK;
      indent?: number;
    } = {},
  ): void {
    const font = opts.mono ? this.fonts.mono : opts.bold ? this.fonts.bold : this.fonts.regular;
    const size = opts.size ?? 9.5;
    const indent = opts.indent ?? 0;
    const width = this.width - indent;
    const lines: string[] = [];
    let line = "";
    for (const word of drawable(font, value).split(/(?<=[\s/-])/)) {
      if (font.widthOfTextAtSize(line + word, size) <= width) {
        line += word;
        continue;
      }
      if (line) lines.push(line.trimEnd());
      line = word;
      // A word longer than the line (a hash): cut it.
      while (font.widthOfTextAtSize(line, size) > width) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) lines.push(line.trimEnd());
    for (const part of lines) {
      this.ensure(size * 1.4);
      this.y -= size * 1.4;
      this.page.drawText(part, {
        x: this.margin + indent,
        y: this.y,
        size,
        font,
        color: opts.color ?? INK,
      });
    }
  }

  /** A label and its value on one row (the value wraps under itself). */
  row(label: string, value: string, opts: { mono?: boolean } = {}): void {
    const size = 8.5;
    this.ensure(size * 1.5);
    this.page.drawText(drawable(this.fonts.regular, label), {
      x: this.margin,
      y: this.y - size * 1.4,
      size,
      font: this.fonts.regular,
      color: MUTED,
    });
    this.text(value, { size, mono: opts.mono, indent: 120 });
  }

  rule(): void {
    this.ensure(12);
    this.y -= 6;
    this.page.drawLine({
      start: { x: this.margin, y: this.y },
      end: { x: this.margin + this.width, y: this.y },
      thickness: 0.5,
      color: RULE,
    });
    this.y -= 6;
  }

  image(image: PDFImage, maxWidth: number, maxHeight: number): void {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const height = image.height * scale;
    this.ensure(height + 6);
    this.y -= height + 4;
    this.page.drawImage(image, {
      x: this.margin + 120,
      y: this.y,
      width: image.width * scale,
      height,
    });
    this.page.drawRectangle({
      x: this.margin + 118,
      y: this.y - 2,
      width: image.width * scale + 4,
      height: height + 4,
      borderColor: RULE,
      borderWidth: 0.5,
    });
  }
}

const AUTHENTICATION: Record<CompletedSigner["authentication"], string> = {
  email_link: "Opened the signing link coss.com emailed to this address",
  customer_asserted: "Identified by the requester's application (embedded signing)",
};

/** The completed, not yet sealed, document. */
export async function buildCompletedPdf(request: CompletedRequest): Promise<PDFDocument> {
  const output = await PDFDocument.create();
  output.setTitle(request.title);
  output.setProducer("coss.com Sign");
  output.setCreator("coss.com Sign");
  output.setCreationDate(request.completedAt);
  output.setModificationDate(request.completedAt);
  const fonts = await embedFonts(output);
  const images = new Map<string, PDFImage>();
  for (const signer of request.signers) {
    images.set(`${signer.id}:signature`, await output.embedPng(signer.signature));
    if (signer.initials)
      images.set(`${signer.id}:initials`, await output.embedPng(signer.initials));
  }

  for (const [index, document] of request.documents.entries()) {
    const source = await loadFlat(document.bytes);
    const pages = await output.copyPages(source, source.getPageIndices());
    for (const [pageIndex, page] of pages.entries()) {
      output.addPage(page);
      for (const field of request.fields) {
        if (field.documentIndex !== index || field.page !== pageIndex + 1) continue;
        if (field.type === "signature" || field.type === "initials") {
          const image = images.get(`${field.signerId}:${field.type}`);
          if (image) drawImageInBox(page, image, field);
        } else if (field.type === "checkbox") {
          if (field.value === "true") drawCheck(page, field);
        } else if (field.value) {
          drawTextInBox(page, fonts.regular, field.value, field);
        }
      }
    }
  }

  const head = request.events.at(-1);
  const writer = new Writer(
    output,
    fonts,
    `coss.com Sign · ${request.id} · certificate of completion · sealed by coss.com: any change to this file breaks the seal.`,
  );
  writer.text("Certificate of completion", { size: 18, bold: true });
  writer.gap(4);
  writer.text(request.title, { size: 12 });
  if (request.sandbox) {
    writer.gap(4);
    writer.text("Test request from a sandbox environment: these signatures have no legal effect.", {
      size: 9,
      color: rgb(0.7, 0.35, 0),
    });
  }
  writer.gap(8);
  writer.row("Request", request.id, { mono: true });
  writer.row("Requested by", request.requester);
  writer.row("Created", iso(request.createdAt));
  writer.row("Completed", iso(request.completedAt));
  writer.row("Audit trail head", head ? `#${head.sequence} ${head.hash}` : "—", { mono: true });

  writer.gap(10);
  writer.text("Documents", { size: 12, bold: true });
  for (const document of request.documents) {
    writer.rule();
    writer.row("File", document.filename);
    writer.row("SHA-256 (as sent)", document.sha256, { mono: true });
  }

  writer.gap(10);
  writer.text("Signers", { size: 12, bold: true });
  for (const signer of request.signers) {
    const consent = request.events.find(
      (event) => event.type === "consented" && event.signerId === signer.id,
    );
    const signed = request.events.find(
      (event) => event.type === "signed" && event.signerId === signer.id,
    );
    writer.rule();
    writer.row("Name", signer.name);
    writer.row("Email", signer.email);
    writer.row("Identified", AUTHENTICATION[signer.authentication]);
    if (signer.clientRef) writer.row("Requester's id", signer.clientRef, { mono: true });
    writer.row("Viewed", iso(signer.viewedAt));
    writer.row(
      "Consented",
      `${iso(signer.consentedAt)}${consent?.details.disclosure_sha256 ? ` · consent text SHA-256 ${consent.details.disclosure_sha256}` : ""}`,
    );
    writer.row("Signed", iso(signer.signedAt));
    if (signed?.ipAddress) writer.row("IP address", signed.ipAddress, { mono: true });
    if (signed?.userAgent) writer.row("Browser", signed.userAgent);
    const signature = images.get(`${signer.id}:signature`);
    if (signature) {
      writer.row("Signature", "");
      writer.image(signature, 180, 50);
    }
    // What they typed, in full (a long value may be cut to fit its box on the page).
    for (const field of request.fields) {
      if (field.signerId !== signer.id || field.type !== "text" || !field.value) continue;
      writer.row(field.label ?? "Text entered", field.value);
    }
  }

  writer.gap(10);
  writer.text("Audit trail", { size: 12, bold: true });
  writer.text(
    "Every event, oldest first. Each event's hash covers the event and the one before it, so the last hash vouches for the whole trail (GET /v1/sign/requests/{id}/audit_trail).",
    { size: 8, color: MUTED },
  );
  const names = new Map(request.signers.map((signer) => [signer.id, signer.email]));
  for (const event of request.events) {
    writer.rule();
    const who = event.signerId ? (names.get(event.signerId) ?? event.signerId) : event.actor;
    writer.row(
      `#${event.sequence} ${event.type}`,
      `${iso(event.occurredAt)} · ${who}${event.ipAddress ? ` · ${event.ipAddress}` : ""}`,
    );
    writer.row("Hash", event.hash, { mono: true });
  }
  return output;
}
