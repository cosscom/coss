/** Test helpers: PDFs to upload (with text anchors) and a store that keeps bytes in Postgres. */
import { PDFDocument, StandardFonts } from "pdf-lib";

export { FakeDocumentStore } from "./store.ts";

export type TestPdfPage = {
  /** Default US Letter, 612×792 points. */
  size?: [number, number];
  /** Text lines drawn from the top left, one per entry (anchors like `{{signature:signer_1}}`). */
  lines?: string[];
};

/** A PDF with these pages (default: one Letter page reading "Signature: {{signature:signer_1}}"). */
export async function buildTestPdf(
  pages: TestPdfPage[] = [{ lines: ["Signature: {{signature:signer_1}}"] }],
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const spec of pages) {
    const [width, height] = spec.size ?? [612, 792];
    const page = document.addPage([width, height]);
    for (const [index, line] of (spec.lines ?? []).entries()) {
      page.drawText(line, { x: 72, y: height - 72 - index * 24, size: 12, font });
    }
  }
  return document.save();
}

/** `buildTestPdf`, base64-encoded as the API takes it. */
export async function buildTestPdfBase64(pages?: TestPdfPage[]): Promise<string> {
  return Buffer.from(await buildTestPdf(pages)).toString("base64");
}

/** A 1×1 PNG, base64: an adopted signature or initials for tests. */
export const TEST_SIGNATURE_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
