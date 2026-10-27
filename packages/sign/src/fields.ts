/**
 * Placing a request's fields: by coordinates on a document's page, or over every occurrence of a
 * text anchor. Every field must fit on its page (as displayed), and every signer needs at least
 * one signature field.
 */
import type { SignAnchor, SignPageSize } from "@coss/db/schema";
import { SignError } from "./errors.ts";
import { MAX_SIGN_FIELDS, type SignFieldInputOutput, type SignFieldType } from "./schemas.ts";

/** A document of the request, in its position. */
export type FieldDocument = { id: string; pages: SignPageSize[]; anchors: SignAnchor[] };

export type PlacedField = {
  documentId: string;
  type: SignFieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  label: string | null;
  anchor: string | null;
  /** Filled at creation (a template's merge field): shown to the signer, not editable. */
  value: string | null;
  prefilled: boolean;
};

// Rounding in viewers and our own anchor boxes: a field may touch the edge.
const EDGE_TOLERANCE = 0.5;

function invalid(message: string, param: string): SignError {
  return new SignError("invalid_fields", message, { param });
}

function checkOnPage(field: PlacedField, page: SignPageSize | undefined, param: string): void {
  if (!page) throw invalid(`Page ${field.page} doesn't exist in that document.`, `${param}.page`);
  if (
    field.x + field.width > page.width + EDGE_TOLERANCE ||
    field.y + field.height > page.height + EDGE_TOLERANCE ||
    field.x < -EDGE_TOLERANCE ||
    field.y < -EDGE_TOLERANCE
  ) {
    throw invalid(
      `The field doesn't fit on page ${field.page} (${page.width}×${page.height} points).`,
      param,
    );
  }
}

/**
 * One signer's fields, placed. `param` names the signer in errors, e.g. `signers[0]`; `values`
 * prefills fields by input index (a template's merge fields).
 */
export function placeSignerFields(
  inputs: readonly SignFieldInputOutput[],
  documents: readonly FieldDocument[],
  param: string,
  opts: {
    values?: readonly (string | null | undefined)[];
    /** Templates in progress may not have one yet. Default `true`. */
    requireSignature?: boolean;
  } = {},
): PlacedField[] {
  const values = opts.values ?? [];
  const placed: PlacedField[] = [];
  for (const [index, input] of inputs.entries()) {
    const fieldParam = `${param}.fields[${index}]`;
    const value = values[index] ?? null;
    const common = {
      type: input.type,
      required: input.required ?? true,
      label: input.label ?? null,
      value,
      prefilled: value !== null,
    };
    if ("anchor" in input) {
      let found = 0;
      for (const document of documents) {
        for (const anchor of document.anchors) {
          if (anchor.text !== input.anchor) continue;
          found++;
          const field: PlacedField = {
            ...common,
            documentId: document.id,
            page: anchor.page,
            x: anchor.x + (input.offset_x ?? 0),
            y: anchor.y + (input.offset_y ?? 0),
            width: input.width ?? anchor.width,
            height: input.height ?? anchor.height,
            anchor: input.anchor,
          };
          checkOnPage(field, document.pages[anchor.page - 1], fieldParam);
          placed.push(field);
        }
      }
      if (found === 0) {
        throw invalid(
          `The anchor ${input.anchor} isn't in any of the documents.`,
          `${fieldParam}.anchor`,
        );
      }
      continue;
    }
    const documentIndex = input.document ?? 0;
    const document = documents[documentIndex];
    if (!document) {
      throw invalid(
        `There is no document ${documentIndex} in \`documents\`.`,
        `${fieldParam}.document`,
      );
    }
    const field: PlacedField = {
      ...common,
      documentId: document.id,
      page: input.page,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      anchor: null,
    };
    checkOnPage(field, document.pages[input.page - 1], fieldParam);
    placed.push(field);
  }
  if (opts.requireSignature !== false && !placed.some((field) => field.type === "signature")) {
    throw invalid("Every signer needs at least one `signature` field.", `${param}.fields`);
  }
  return placed;
}

/** Throws when the request as a whole has more fields than one request may. */
export function checkFieldCount(total: number): void {
  if (total > MAX_SIGN_FIELDS) {
    throw invalid(
      `A request may have at most ${MAX_SIGN_FIELDS} fields (anchors included).`,
      "signers",
    );
  }
}
