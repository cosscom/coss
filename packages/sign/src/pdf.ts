/**
 * Reading uploaded PDFs: whether coss.com can work with one (not encrypted, not too long), each
 * page's size and the text anchors in it. Coordinates are PDF points with the origin at the top
 * left of the page *as displayed* (its crop box, with its `/Rotate` applied): what a viewer and a
 * customer placing fields see.
 */
import type { SignAnchor, SignPageSize } from "@coss/db/schema";
import { EncryptedPDFError, PDFDocument } from "pdf-lib";
import { getDocument, VerbosityLevel } from "pdfjs-dist/legacy/build/pdf.mjs";
import { SignError } from "./errors.ts";
import { MAX_SIGN_DOCUMENT_PAGES, SIGN_ANCHOR_PATTERN } from "./schemas.ts";

export type InspectedPdf = { pages: SignPageSize[]; anchors: SignAnchor[] };

const PDF_HEADER = "%PDF-";

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Throws `invalid_document` unless `bytes` is a PDF coss.com can sign. */
export async function inspectPdf(bytes: Uint8Array): Promise<InspectedPdf> {
  // The header may follow up to 1 KB of junk (the PDF spec allows it; readers accept it).
  if (!new TextDecoder("latin1").decode(bytes.subarray(0, 1024)).includes(PDF_HEADER)) {
    throw new SignError("invalid_document", "The file is not a PDF.");
  }
  let loaded: PDFDocument;
  try {
    // pdf-lib is what fills and seals the document later: it must be able to load it unchanged.
    loaded = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
  } catch (error) {
    if (error instanceof EncryptedPDFError) {
      throw new SignError(
        "invalid_document",
        "The PDF is encrypted or password-protected. Upload an unprotected copy.",
      );
    }
    throw new SignError("invalid_document", "The PDF could not be read. Is it damaged?");
  }
  // Completion flattens form fields (else they'd stay editable over what was signed): it must be
  // able to.
  try {
    loaded.getForm().flatten();
  } catch {
    throw new SignError(
      "invalid_document",
      "The PDF's form fields can't be flattened. Print it to a new PDF and upload that.",
    );
  }

  const task = getDocument({
    // pdf.js takes ownership of (detaches) the buffer it gets, and refuses a `Buffer`: a copy.
    data: new Uint8Array(bytes),
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: VerbosityLevel.ERRORS,
  });
  const unreadable = (): never => {
    throw new SignError("invalid_document", "The PDF could not be read. Is it damaged?");
  };
  let pdf: Awaited<typeof task.promise>;
  try {
    pdf = await task.promise;
  } catch {
    await task.destroy();
    return unreadable();
  }
  try {
    if (pdf.numPages > MAX_SIGN_DOCUMENT_PAGES) {
      throw new SignError(
        "invalid_document",
        `The PDF has ${pdf.numPages} pages; at most ${MAX_SIGN_DOCUMENT_PAGES} are supported.`,
      );
    }
    const pages: SignPageSize[] = [];
    const anchors: SignAnchor[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number).catch(unreadable);
      // pdf.js scales a page by its `/UserUnit`; pdf-lib (filling and sealing) doesn't.
      if (page.userUnit !== 1) {
        throw new SignError(
          "invalid_document",
          `Page ${number} uses a custom unit size (/UserUnit), which isn't supported.`,
        );
      }
      const viewport = page.getViewport({ scale: 1 });
      pages.push({ width: round(viewport.width), height: round(viewport.height) });
      const content = await page.getTextContent().catch(unreadable);
      for (const item of content.items) {
        if (!("str" in item) || !item.str.includes("{{")) continue;
        const [a = 1, b = 0, c = 0, d = 0, e = 0, f = 0] = item.transform as number[];
        const fontHeight = item.height || Math.hypot(c, d);
        const length = item.str.length;
        for (const match of item.str.matchAll(SIGN_ANCHOR_PATTERN)) {
          const index = match.index ?? 0;
          // pdf.js reports a run's width, not each glyph's: an anchor inside a longer run is
          // placed by its share of the characters (exact when the anchor is a run of its own).
          const start = (item.width * index) / length;
          const end = (item.width * (index + match[0].length)) / length;
          // Unit vector along the baseline, so rotated text is placed along its own direction.
          const scale = Math.hypot(a, b) || 1;
          const ux = a / scale;
          const uy = b / scale;
          const corners = [
            [e + ux * start, f + uy * start],
            [e + ux * end, f + uy * end],
            [e + ux * start - uy * fontHeight, f + uy * start + ux * fontHeight],
            [e + ux * end - uy * fontHeight, f + uy * end + ux * fontHeight],
          ].map(([x, y]) => viewport.convertToViewportPoint(x ?? 0, y ?? 0));
          const xs = corners.map(([x]) => x ?? 0);
          const ys = corners.map(([, y]) => y ?? 0);
          anchors.push({
            text: match[0],
            page: number,
            x: round(Math.min(...xs)),
            y: round(Math.min(...ys)),
            width: round(Math.max(...xs) - Math.min(...xs)),
            height: round(Math.max(...ys) - Math.min(...ys)),
          });
        }
      }
      page.cleanup();
    }
    return { pages, anchors };
  } finally {
    await task.destroy();
  }
}
