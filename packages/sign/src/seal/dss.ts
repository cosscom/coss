/**
 * The Document Security Store (PDF 2.0, 12.8.4.3; PAdES B-LT): the seal's validation data
 * (`ltv.ts`) appended to a sealed PDF as an incremental update. The update comes after the
 * signature's byte ranges, so the seal still covers every byte it signed, and validators treat
 * DSS additions as allowed changes. No `/VRI` entries: validators look up what they need in the
 * DSS's lists (PAdES baseline doesn't require them).
 */
import { PDFDocument, PDFName, PDFRef } from "pdf-lib";
import type { ValidationData } from "./ltv.ts";

function stream(objectNumber: number, bytes: Uint8Array): Buffer {
  return Buffer.concat([
    Buffer.from(`${objectNumber} 0 obj\n<< /Length ${bytes.length} >>\nstream\n`, "latin1"),
    Buffer.from(bytes),
    Buffer.from("\nendstream\nendobj\n", "latin1"),
  ]);
}

function references(first: number, count: number): string {
  return `[${Array.from({ length: count }, (_, index) => `${first + index} 0 R`).join(" ")}]`;
}

/** `sealed` with `data` in a DSS: the same bytes, then one incremental update. */
export async function appendDss(sealed: Uint8Array, data: ValidationData): Promise<Uint8Array> {
  const text = Buffer.from(sealed).toString("latin1");
  const startxref = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(text);
  if (!startxref) throw new Error("The sealed PDF has no trailing startxref.");
  const document = await PDFDocument.load(sealed, { updateMetadata: false });
  const { context } = document;
  const root = context.trailerInfo.Root as PDFRef | undefined;
  if (!root) throw new Error("The sealed PDF has no catalog.");

  const first = context.largestObjectNumber + 1;
  const dssNumber = first + data.certificates.length + data.ocspResponses.length + data.crls.length;
  const parts: Buffer[] = [Buffer.from("\n", "latin1")];
  let offset = sealed.length + 1;
  const offsets: number[] = [];
  const push = (part: Buffer) => {
    parts.push(part);
    offset += part.length;
  };

  let next = first;
  const entries: string[] = [];
  for (const [key, list] of [
    ["Certs", data.certificates],
    ["OCSPs", data.ocspResponses],
    ["CRLs", data.crls],
  ] as const) {
    if (list.length === 0) continue;
    entries.push(`/${key} ${references(next, list.length)}`);
    for (const bytes of list) {
      offsets.push(offset);
      push(stream(next++, bytes));
    }
  }
  offsets.push(offset);
  push(Buffer.from(`${dssNumber} 0 obj\n<< ${entries.join(" ")} >>\nendobj\n`, "latin1"));

  // The catalog again, under its own number, now pointing at the DSS (and naming the extension
  // that defines it, as PDF 1.7 readers expect: ETSI's, level 5).
  const catalog = document.catalog.clone(context);
  catalog.set(PDFName.of("DSS"), PDFRef.of(dssNumber));
  if (!catalog.get(PDFName.of("Extensions"))) {
    catalog.set(
      PDFName.of("Extensions"),
      context.obj({ ESIC: { BaseVersion: PDFName.of("1.7"), ExtensionLevel: 5 } }),
    );
  }
  const catalogOffset = offset;
  push(
    Buffer.from(
      `${root.objectNumber} ${root.generationNumber} obj\n${catalog.toString()}\nendobj\n`,
      "latin1",
    ),
  );

  const xrefOffset = offset;
  const entryLine = (at: number, generation = 0) =>
    `${String(at).padStart(10, "0")} ${String(generation).padStart(5, "0")} n\r\n`;
  const id = context.trailerInfo.ID;
  push(
    Buffer.from(
      [
        "xref\n",
        `${root.objectNumber} 1\n`,
        entryLine(catalogOffset, root.generationNumber),
        `${first} ${offsets.length}\n`,
        ...offsets.map((at) => entryLine(at)),
        "trailer\n",
        `<< /Size ${dssNumber + 1} /Root ${root.objectNumber} ${root.generationNumber} R /Prev ${startxref[1]}`,
        id ? ` /ID ${id.toString()}` : "",
        " >>\n",
        `startxref\n${xrefOffset}\n%%EOF\n`,
      ].join(""),
      "latin1",
    ),
  );
  return new Uint8Array(Buffer.concat([Buffer.from(sealed), ...parts]));
}
