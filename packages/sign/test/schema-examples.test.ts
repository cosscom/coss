/** Each wire schema's first example is what the API reference shows: it must parse. */
import { expect, test } from "bun:test";
import type { z } from "zod";
import { inspectPdf } from "../src/pdf.ts";
import * as schemas from "../src/schemas.ts";

const SCHEMAS: Record<string, z.ZodType> = {
  UploadSignDocumentRequest: schemas.UploadSignDocumentRequest,
  SignDocumentObject: schemas.SignDocumentObject,
  SignDocumentList: schemas.SignDocumentList,
  DeletedSignDocument: schemas.DeletedSignDocument,
  CreateSignRequestRequest: schemas.CreateSignRequestRequest,
  SignRequestObject: schemas.SignRequestObject,
  SignRequestList: schemas.SignRequestList,
  SignEventObject: schemas.SignEventObject,
  SignEventList: schemas.SignEventList,
};

for (const [name, schema] of Object.entries(SCHEMAS)) {
  test(`${name}'s example parses`, () => {
    const examples = (schema.meta() as { examples?: unknown[] } | undefined)?.examples ?? [];
    expect(examples.length).toBeGreaterThan(0);
    for (const example of examples) expect(schema.safeParse(example).error).toBeUndefined();
  });
}

test("the example PDF is one coss.com accepts, with the anchor the examples use", async () => {
  const { pages, anchors } = await inspectPdf(Buffer.from(schemas.SIGN_EXAMPLE_PDF, "base64"));
  expect(pages).toEqual([{ width: 612, height: 792 }]);
  expect(anchors.map((anchor) => anchor.text)).toEqual(["{{signature:signer_1}}"]);
});

test("fields are either placed or anchored, never both", () => {
  const field = { type: "signature", page: 1, x: 1, y: 1, width: 10, height: 10 };
  expect(schemas.SignFieldInput.safeParse(field).success).toBe(true);
  expect(
    schemas.SignFieldInput.safeParse({ ...field, anchor: "{{signature:signer_1}}" }).success,
  ).toBe(false);
  expect(schemas.SignFieldInput.safeParse({ type: "signature", anchor: "signer_1" }).success).toBe(
    false,
  );
});
